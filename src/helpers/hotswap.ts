'use strict';

import {
  commands,
  debug,
  ExtensionContext,
  QuickPickItem,
  window,
  workspace,
  WorkspaceConfiguration,
  ConfigurationTarget,
} from 'vscode';
import { findRuntimes, getRuntime, IJavaRuntime } from 'jdk-utils';
import { accessSync, copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

import AdmZip from 'adm-zip';
import { join, parse } from 'path';
import JetbrainsRuntimeUtil from './jetbrainsUtil';
import { resolveVaadinHomeDirectory } from './projectFilesHelpers';
import { trackDebugWithHotswap } from './ampliUtil';
import { getJavaDebugConfigurationType } from './javaUtil';

const JAVA_DEBUG_HOTCODE_REPLACE = 'debug.settings.hotCodeReplace';
const JAVA_AUTOBUILD = 'autobuild.enabled';
const VSCODE_PLUGIN_DIR = "vscode-plugin";
const HOTSWAPAGENT_JAR = 'hotswap-agent.jar';
const LAUNCH_CONFIGURATION_NAME = 'Debug using Hotswap Agent';

class JavaRuntimeQuickPickItem implements QuickPickItem {
  constructor(item: IJavaRuntime | undefined) {
    this.item = item;
    this.label = item?.version?.java_version || 'unknown';
    if (!item) {
      this.label = 'Download from https://github.com/JetBrains/JetBrainsRuntime';
    }
  }

  item: IJavaRuntime | undefined;
  label: string;
  description?: string | undefined;
  detail?: string | undefined;
}

export async function setupHotswap(context: ExtensionContext, quiet: boolean = false): Promise<boolean> {
  const javaHome = await setupJavaHome(quiet);
  if (!javaHome) {
    showCancellationWarning();
    return false;
  }

  await ensureHotswapFriendlySettings();

  if (!(await installHotswapJar(context))) {
    showCancellationWarning();
    return false;
  }

  if (!(await updateLaunchConfiguration(javaHome))) {
    showCancellationWarning();
    return false;
  }

  if (quiet) {
    window.showInformationMessage('Hotswap configuration finished');
    return true;
  }

  window.showInformationMessage('Hotswap configuration finished', LAUNCH_CONFIGURATION_NAME).then((action) => {
    if (action) {
      commands.executeCommand('vaadin.debugUsingHotswap');
    }
  });

  return true;
}

export async function debugUsingHotswap(context: ExtensionContext, autoSetup: boolean = false) {
  if (!workspace.workspaceFolders) {
    window.showErrorMessage('No workspace is open.');
    return;
  }

  trackDebugWithHotswap();

  await ensureHotswapFriendlySettings();

  const workspaceFolder = workspace.workspaceFolders[0];

  const debugConfigurationType = getJavaDebugConfigurationType();
  const launchConfiguration = workspace.getConfiguration('launch');
  const configurations = launchConfiguration.get<any[]>('configurations');
  const configEntry = configurations?.find((c) => c.name === LAUNCH_CONFIGURATION_NAME);
  if (!configEntry) {
    // configuration does not exist

    if (autoSetup) {
      const setupDone = await setupHotswap(context, true);
      if (!setupDone) {
        return;
      }
    } else {
      window
        .showWarningMessage('Hotswap not configured, please run Setup Hotswap Agent first.', 'Run Setup Hotswap Agent')
        .then((action) => {
          if (action) {
            commands.executeCommand('vaadin.setupHotswap');
          }
        });
      return;
    }
  } else if (configEntry.type !== debugConfigurationType) {
    // Keep launch type in sync with the active Java extension.
    configEntry.type = debugConfigurationType;
    await launchConfiguration.update('configurations', configurations);
  }

  try {
    const success = await debug.startDebugging(workspaceFolder, LAUNCH_CONFIGURATION_NAME);
    if (!success) {
      window.showErrorMessage(`Failed to launch: ${LAUNCH_CONFIGURATION_NAME}`);
    }
  } catch (error) {
    window.showErrorMessage(`Failed to launch: ${LAUNCH_CONFIGURATION_NAME}: ${error}`);
  }
}

/**
 * Looks for existing Java Runtimes and asks user to pick one to be used.
 * Download link is present on top of the list.
 * @returns java home if selected
 */
async function setupJavaHome(quiet: boolean): Promise<string | undefined> {
  if (quiet) {
    const downloadedJdk = await JetbrainsRuntimeUtil.downloadLatestJBR(quiet);
    return downloadedJdk ? getJavaHome(downloadedJdk) : undefined;
  }

  const runtimes = await findJetBrainsRuntimes();
  const items = runtimes.map((r) => new JavaRuntimeQuickPickItem(r));
  items.unshift(new JavaRuntimeQuickPickItem(undefined));
  const selected = await window.showQuickPick(items, {
    placeHolder: 'Choose existing JetBrains Runtime or download latest version.',
  });

  if (!selected) {
    return;
  }

  if (!selected.item) {
    const downloadedJdk = await JetbrainsRuntimeUtil.downloadLatestJBR();
    return downloadedJdk ? getJavaHome(downloadedJdk) : undefined;
  }

  return selected.item.homedir;
}

/**
 * Finds existing Java runtimes and filters JetBrains
 * @returns IJavaRuntime array of JetBrains Runtimes only
 */
async function findJetBrainsRuntimes(): Promise<IJavaRuntime[]> {
  let runtimes = await findDotVaadinRuntimes();
  runtimes = runtimes.concat(await findRuntimes({ withVersion: true }));
  return runtimes.filter((r) => {
    try {
      const releaseFile = join(r.homedir, 'release');
      accessSync(releaseFile);
      const content = readFileSync(releaseFile).toString();
      const match = content.match(/IMPLEMENTOR="([^"]+)"/);
      return match ? match[1].includes('JetBrains') : false;
    } catch {}
    return false;
  });
}

/**
 * Finds .vaadin/jdk installed runtimes
 * @returns IJavaRuntime array of .vaadin/jdk runtimes
 */
async function findDotVaadinRuntimes(): Promise<IJavaRuntime[]> {
  const vaadinJdkPath = join(resolveVaadinHomeDirectory(), 'jdk');
  const jdks = [];
  try {
    accessSync(vaadinJdkPath);
    const vaadinJdks = readdirSync(vaadinJdkPath).map((dir) => getJavaHome(join(vaadinJdkPath, dir)));
    for (const i in vaadinJdks) {
      const jdk = await getRuntime(vaadinJdks[i], { withVersion: true });
      if (jdk) {
        jdks.push(jdk);
      }
    }
  } catch {}
  return jdks;
}

/**
 * Looks for jar version
 * @param jarPath path to jar
 * @returns version if present
 */
function getJarVersion(jarPath: string): string | undefined {
  try {
    accessSync(jarPath);

    const zip = new AdmZip(jarPath);
    const manifestEntry = zip.getEntry('META-INF/MANIFEST.MF');
    if (!manifestEntry) {
      console.log('META-INF/MANIFEST.MF not found in the JAR file.');
      return undefined;
    }

    const manifestContent = manifestEntry.getData().toString('utf-8');
    const versionMatch = manifestContent.match(/^Implementation-Version:\s*(.+)$/m);

    return versionMatch ? versionMatch[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Copies hotswap-agent.jar into java.home/lib/hotswap.
 * @param context extension context
 * @returns true on success
 */
async function installHotswapJar(context: ExtensionContext): Promise<boolean> {
  
  const hotswapDir = join(resolveVaadinHomeDirectory(), VSCODE_PLUGIN_DIR);
  const jarPath = join(hotswapDir, HOTSWAPAGENT_JAR);

  try {
    accessSync(hotswapDir);
  } catch {
    // create if not exists
    if (!mkdirSync(hotswapDir, { recursive: true })) {
      handleFailure('Cannot create ' + hotswapDir);
      return false;
    }
  }

  const hotswapAgentJar = join(context.extensionPath, 'resources', HOTSWAPAGENT_JAR);
  try {
    copyFileSync(hotswapAgentJar, jarPath);
  } catch (err: any) {
    handleFailure(err);
    return false;
  }
  console.log('hotswap-agent.jar installed into ' + jarPath);

  return true;
}

/**
 * Updates launch configuration
 * @returns true on success
 */
async function updateLaunchConfiguration(javaHome: string): Promise<boolean> {
  if (!workspace.workspaceFolders) {
    window.showErrorMessage('No workspace is open.');
    return false;
  }

  const workspaceFolder = workspace.workspaceFolders[0].uri.fsPath;
  const vscodeFolder = join(workspaceFolder, '.vscode');
  const launchJsonPath = join(vscodeFolder, 'launch.json');
  const debugConfigurationType = getJavaDebugConfigurationType();

  try {
    accessSync(launchJsonPath);
  } catch {
    // launch.json not exists, create
    const launchConfig: any = { version: '0.2.0', configurations: [] };
    writeFileSync(launchJsonPath, JSON.stringify(launchConfig, null, 4));
  }

  const mainClass = await findSpringBootApplicationMainClass();

  const launchConfiguration = workspace.getConfiguration('launch');
  const configurations = launchConfiguration.get<any[]>('configurations');

  let configEntry = configurations?.find((c) => c.name === LAUNCH_CONFIGURATION_NAME);

  const paramsList: string[] = [];
  const addOpens = "--add-opens";
  paramsList.push(addOpens, "java.base/sun.nio.ch=ALL-UNNAMED");
  paramsList.push(addOpens, "java.base/java.lang=ALL-UNNAMED");
  paramsList.push(addOpens, "java.base/java.lang.reflect=ALL-UNNAMED");
  paramsList.push(addOpens, "java.base/java.io=ALL-UNNAMED");
  paramsList.push(addOpens, "java.base/sun.security.action=ALL-UNNAMED");
  paramsList.push(addOpens, "java.desktop/java.beans=ALL-UNNAMED");
  paramsList.push(addOpens, "java.desktop/com.sun.beans=ALL-UNNAMED");
  paramsList.push(addOpens, "java.desktop/com.sun.beans.introspect=ALL-UNNAMED");
  paramsList.push(addOpens, "java.desktop/com.sun.beans.util=ALL-UNNAMED");
  paramsList.push(addOpens, "java.base/jdk.internal.loader=ALL-UNNAMED");
  paramsList.push("-XX:+AllowEnhancedClassRedefinition");
  paramsList.push("-XX:+ClassUnloading");
  paramsList.push(`-javaagent:${join(resolveVaadinHomeDirectory(), VSCODE_PLUGIN_DIR, HOTSWAPAGENT_JAR)}`);

  if (configEntry) {
    // Align existing configuration with the Java extension currently available.
    configEntry.type = debugConfigurationType;
    configEntry.javaExec = getJavaExecutable(javaHome);
    configEntry.mainClass = mainClass;
    configEntry.vmArgs = paramsList.join(' ');
  } else {
    configEntry = {
      type: debugConfigurationType,
      name: LAUNCH_CONFIGURATION_NAME,
      request: 'launch',
      javaExec: getJavaExecutable(javaHome),
      mainClass: mainClass,
      vmArgs: paramsList.join(' ')
    };
    configurations?.unshift(configEntry);
  }

  await launchConfiguration.update('configurations', configurations);

  return true;
}

function getJavaConfiguration(): WorkspaceConfiguration {
  return workspace.getConfiguration('java');
}

async function ensureHotswapFriendlySettings(): Promise<void> {
  const configuration = getJavaConfiguration();
  const updates: Array<Thenable<void>> = [];

  if (configuration.get(JAVA_DEBUG_HOTCODE_REPLACE) !== 'auto') {
    updates.push(configuration.update(JAVA_DEBUG_HOTCODE_REPLACE, 'auto', ConfigurationTarget.Workspace));
  }

  if (configuration.get<boolean>(JAVA_AUTOBUILD) === false) {
    updates.push(configuration.update(JAVA_AUTOBUILD, true, ConfigurationTarget.Workspace));
  }

  await Promise.all(updates);
}

function showCancellationWarning() {
  window.showWarningMessage('Hotswap Agent setup cancelled');
}

function handleFailure(err: Error | string) {
  console.error(err);
  window.showErrorMessage('hotswap-agent.jar installation failed, check logs for details');
}

function getJavaHome(jdkHome: string): string {
  if (process.platform === 'darwin') {
    return join(jdkHome, 'Contents', 'Home');
  }

  return jdkHome;
}

function getJavaExecutable(javaHome: string) {
  const bin = process.platform === 'win32' ? 'java.exe' : 'java';
  return join(javaHome, 'bin', bin);
}

async function findSpringBootApplicationMainClass(): Promise<string | undefined> {
  const files = await workspace.findFiles('**/*.java', '**/target/**');
  for (const file of files) {
    try {
      const document = await workspace.openTextDocument(file);
      const content = document.getText();
      if (content.includes('@SpringBootApplication')) {
        const className = parse(file.fsPath).name;
        const match = content.match(/package\s+([a-zA-Z0-9_.]+);/);
        return match ? match[1] + '.' + className : className;
      }
    } catch (error) {
      console.error(`Error reading file: ${file.fsPath}`, error);
    }
  }
}

export async function checkBundledHotswapAgentVersion(context: ExtensionContext): Promise<void> {
  const bundledJarPath = join(context.extensionPath, 'resources', HOTSWAPAGENT_JAR);
  const bundledVersion = getJarVersion(bundledJarPath);

  const installedJarPath = join(resolveVaadinHomeDirectory(), VSCODE_PLUGIN_DIR, HOTSWAPAGENT_JAR);
  const installedVersion = getJarVersion(installedJarPath);

  // install hotswap-agent.jar if not present
  if (!installedVersion || bundledVersion !== installedVersion) {
    setupHotswap(context, true);
  }

}
