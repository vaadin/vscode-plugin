'use strict';

import { commands, debug, ExtensionContext, QuickPickItem, window, workspace, WorkspaceConfiguration } from 'vscode';
import { findRuntimes, IJavaRuntime } from 'jdk-utils';
import { accessSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';

import AdmZip from 'adm-zip';
import { join, resolve } from 'path';
import JetbrainsRuntimeUtil from './jetbrainsUtil';

const JAVA_DEBUG_HOTCODE_REPLACE = 'debug.settings.hotCodeReplace';
const HOTSWAPAGENT_JAR = 'hotswap-agent.jar'
const LAUNCH_CONFIGURATION_NAME = "Debug using Hotswap Agent";

class JavaRuntimeQuickPickItem implements QuickPickItem {
    constructor(item: IJavaRuntime | undefined) {
        this.item = item;
        this.label = item?.version?.java_version || 'unknown';
        if (item?.homedir) {
            this.description = item?.homedir;
            const ver = getImplementationVersion(item.homedir);
            if (ver) {
                this.detail = 'hotswap-agent.jar detected: ' + ver;
            }
        }

        if (!item) {
            this.label = "Download from https://github.com/JetBrains/JetBrainsRuntime";
        }
        
    }

    item: IJavaRuntime | undefined;
    label: string;
    description?: string | undefined;
    detail?: string | undefined;
}

export async function setupHotswap(context: ExtensionContext) {

    const javaHome = await setupJavaHome();
    if (!javaHome) {
        showCancellationWarning();
        return;
    }
    
    getJavaConfiguration().update(JAVA_DEBUG_HOTCODE_REPLACE, 'auto');

    if (!await installHotswapJar(context, javaHome)) {
        showCancellationWarning();
        return;
    }

    if (!await updateLaunchConfiguration(javaHome)) {
        showCancellationWarning();
        return;
    }

    window.showInformationMessage('hotswap-agent.jar installed', LAUNCH_CONFIGURATION_NAME).then(action => {
        if (action) {
            commands.executeCommand('vaadin.debugUsingHotswap');
        }
    });
}

export async function debugUsingHotswap(context: ExtensionContext) {
    if (!workspace.workspaceFolders) {
        window.showErrorMessage("No workspace is open.");
        return;
    }

    const workspaceFolder = workspace.workspaceFolders[0];

    const launchConfiguration = workspace.getConfiguration('launch')
    const configurations = launchConfiguration.get<any[]>('configurations');
    if(!configurations?.find(c => c.name === LAUNCH_CONFIGURATION_NAME)) {
        // configuration does not exist
        window.showWarningMessage('Hotswap not configured, please run Setup Hotswap Agent first.', 'Run Setup Hotswap Agent').then((action) => {
            if (action) {
                commands.executeCommand('vaadin.setupHotswap');
            }
        })
        return;
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
async function setupJavaHome(): Promise<string | undefined> {   
    const runtimes = await findRuntimes({ withVersion: true });
    const items = runtimes.map(r => new JavaRuntimeQuickPickItem(r));
    items.unshift(new JavaRuntimeQuickPickItem(undefined));
    const selected = await window.showQuickPick(items, {
        placeHolder: 'Choose existing JetBrains Runtime or download latest version.'
    });

    if (!selected?.item) {
        const downloadedJdk = await JetbrainsRuntimeUtil.downloadLatestJBR();
        return downloadedJdk ? getJavaHome(downloadedJdk) : undefined;
    }

    const selectedJdk = selected?.item?.homedir;
    return selectedJdk ? getJavaHome(selectedJdk) : undefined;
}

/**
 * Looks for java.home/lib/hotswap/hotswap-agent.jar version
 * @param homedir Java home directory
 * @returns version if present
 */
function getImplementationVersion(homedir: string): string | undefined {
    try {
        const jarPath = resolve(homedir, 'lib', 'hotswap', HOTSWAPAGENT_JAR);
        accessSync(jarPath)

        const zip = new AdmZip(jarPath);
        const manifestEntry = zip.getEntry("META-INF/MANIFEST.MF");
        if (!manifestEntry) {
            console.log("META-INF/MANIFEST.MF not found in the JAR file.");
            return undefined;
        }

        const manifestContent = manifestEntry.getData().toString("utf-8");
        const versionMatch = manifestContent.match(/^Implementation-Version:\s*(.+)$/m);

        return versionMatch ? versionMatch[1].trim() : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Copies hotswap-agent.jar into java.home/lib/hotswap.
 * @param context extension context
 * @param javaHome java home
 * @returns true on success
 */
async function installHotswapJar(context: ExtensionContext, javaHome: string): Promise<boolean> {
    
    const hotswapDir = join(javaHome, 'lib', 'hotswap');
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
    } catch(err: any) {
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
        window.showErrorMessage("No workspace is open.");
        return false;
    }

    const workspaceFolder = workspace.workspaceFolders[0].uri.fsPath;
    const vscodeFolder = join(workspaceFolder, '.vscode');
    const launchJsonPath = join(vscodeFolder, 'launch.json');

    try {
        accessSync(launchJsonPath)
    } catch {
        // launch.json not exists, create
        const launchConfig: any = { version: "0.2.0", configurations: [] };
        writeFileSync(launchJsonPath, JSON.stringify(launchConfig, null, 4));
    }

    const launchConfiguration = workspace.getConfiguration('launch')
    const configurations = launchConfiguration.get<any[]>('configurations');

    let configEntry = configurations?.find(c => c.name === LAUNCH_CONFIGURATION_NAME);
    if (configEntry) {
        configEntry.javaExec = getJavaExecutable(javaHome)
    } else {
        configEntry = {
            'type': 'java',
            'name': LAUNCH_CONFIGURATION_NAME,
            'request': 'launch',
            'javaExec': getJavaExecutable(javaHome),
            'mainClass': 'com.example.application.Application',
            'vmArgs': '-XX:+AllowEnhancedClassRedefinition -XX:+ClassUnloading -XX:HotswapAgent=fatjar'
        }
        configurations?.unshift(configEntry);
    }

    await launchConfiguration.update('configurations', configurations);

    return true;
}

function getJavaConfiguration(): WorkspaceConfiguration {
	return workspace.getConfiguration('java');
}

function showCancellationWarning() {
    window.showWarningMessage("Hotswap Agent setup cancelled");
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
