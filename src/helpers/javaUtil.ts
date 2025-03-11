import * as vscode from 'vscode';

export const JAVA_DEBUG_CONFIGURATION = 'java.debug.settings';
export const JAVA_LANGID: string = 'java';

const JAVA_EXTENSION_ID = 'redhat.java';
const JAVA_EXECUTE_WORKSPACE_COMMAND = 'java.execute.workspaceCommand';
const JAVA_RESOLVE_MAINMETHOD = 'vscode.java.resolveMainMethod';

export interface IMainClassOption {
  readonly mainClass: string;
  readonly projectName?: string;
  readonly filePath?: string;
}

export interface IMainMethod extends IMainClassOption {
  range: vscode.Range;
}

export async function resolveMainMethod(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<IMainMethod[]> {
  if (token) {
    return <IMainMethod[]>await executeJavaLanguageServerCommand(JAVA_RESOLVE_MAINMETHOD, uri.toString(), token);
  }

  return <IMainMethod[]>await executeJavaLanguageServerCommand(JAVA_RESOLVE_MAINMETHOD, uri.toString());
}

export function getJavaExtension(): vscode.Extension<any> | undefined {
  return vscode.extensions.getExtension(JAVA_EXTENSION_ID);
}

export function executeJavaLanguageServerCommand(...rest: any[]) {
  return executeJavaExtensionCommand(JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
}

export async function executeJavaExtensionCommand(commandName: string, ...rest: any[]) {
  const javaExtension = getJavaExtension();
  if (!javaExtension) {
    console.warn(`Cannot execute command ${commandName}, VS Code Redhat Java Extension is not enabled.`);
    return;
  }
  if (!javaExtension?.isActive) {
    await javaExtension.activate();
  }
  return vscode.commands.executeCommand(commandName, ...rest);
}
