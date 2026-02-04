import * as vscode from 'vscode';
import { downloadAndExtract, projectPathExists, readProjectFile } from './helpers/projectFilesHelpers';
import { statusBarItem, startServer } from './helpers/server';
import { newProjectUserInput } from './helpers/userInput';
import { undoManager } from './helpers/undoManager';
import { deleteProperties } from './helpers/properties';
import { checkBundledHotswapAgentVersion, debugUsingHotswap, setupHotswap } from './helpers/hotswap';
import { DebugCodeLensProvider } from './debug-using-hotswapagent';
import { StyleSheetLinkProvider } from './stylesheet-link-provider';
import { getJavaExtensionId, JAVA_DEBUG_CONFIGURATION, JAVA_LANGID, ORACLE_JAVA_EXTENSION_ID } from './helpers/javaUtil';
import { trackPluginInitialized } from './helpers/ampliUtil';

const ENABLE_CODE_LENS_VARIABLE = 'enableRunDebugCodeLens';

export async function activate(context: vscode.ExtensionContext) {
  let startServerCommand = vscode.commands.registerCommand('vaadin.start', function () {
    startServer();
  });
  let newProjectCommand = vscode.commands.registerCommand('vaadin.newProject', function () {
    createNewProject();
  });
  let setupHotswapCommand = vscode.commands.registerCommand(
    'vaadin.setupHotswap',
    function (noPrompt: boolean | undefined) {
      return setupHotswap(context, noPrompt);
    },
  );
  let debugUsingHotswapCommand = vscode.commands.registerCommand(
    'vaadin.debugUsingHotswap',
    function (autoSetup: boolean | undefined) {
      debugUsingHotswap(context, autoSetup);
    },
  );

  // disposables
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(startServerCommand);
  context.subscriptions.push(newProjectCommand);
  context.subscriptions.push(setupHotswapCommand);
  context.subscriptions.push(debugUsingHotswapCommand);

  const configuration = vscode.workspace.getConfiguration(JAVA_DEBUG_CONFIGURATION);
  const isCodeLensEnabled = configuration.get<boolean>(ENABLE_CODE_LENS_VARIABLE);

  const javaExtensionId = getJavaExtensionId();
  // Oracle extension does not expose the Red Hat setting, so default to showing the lens when it is installed.
  if (javaExtensionId && (isCodeLensEnabled ?? javaExtensionId === ORACLE_JAVA_EXTENSION_ID)) {
    const lensProvider = vscode.languages.registerCodeLensProvider(JAVA_LANGID, new DebugCodeLensProvider());
    context.subscriptions.push(lensProvider);
  }

  // Register @StyleSheet annotation definition provider
  const styleSheetDefinitionProvider = vscode.languages.registerDefinitionProvider(
    { language: JAVA_LANGID, scheme: 'file' },
    new StyleSheetLinkProvider(),
  );
  context.subscriptions.push(styleSheetDefinitionProvider);

  if (isVaadinProject()) {
    startServer();
  }

  trackPluginInitialized();
  // Best-effort check to keep users informed about bundled hotswap updates.
  void checkBundledHotswapAgentVersion(context);

  checkBundledHotswapAgentVersion(context);

  vscode.workspace.onDidSaveTextDocument((doc) => undoManager.documentSaveListener(doc));
}

export function deactivate() {
  deleteProperties();
  statusBarItem.hide();
  console.log('Vaadin Copilot integration stopped');
}

async function createNewProject() {
  newProjectUserInput().then((model) => {
    if (!model) {
      vscode.window.showWarningMessage('Vaadin project generation cancelled');
      return;
    }
    downloadAndExtract(model);
  });
}

function isVaadinProject(): boolean {
  const vaadinRegex = /com.vaadin/;

  // Maven projects
  if (projectPathExists('pom.xml')) {
    const contents = readProjectFile('pom.xml');
    return contents?.match(vaadinRegex) !== null;
  }

  // Gradle projects
  if (projectPathExists('build.gradle')) {
    const contents = readProjectFile('build.gradle');
    return contents?.match(vaadinRegex) !== null;
  }

  // Gradle Kotlin projects
  if (projectPathExists('build.gradle.kts')) {
    const contents = readProjectFile('build.gradle.kts');
    return contents?.match(vaadinRegex) !== null;
  }

  return false;
}
