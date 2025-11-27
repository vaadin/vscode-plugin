import * as vscode from 'vscode';

export const JAVA_DEBUG_CONFIGURATION = 'java.debug.settings';
export const JAVA_LANGID: string = 'java';
export const ORACLE_JAVA_EXTENSION_ID = 'oracle-labs-graalvm.graalvm';

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

/**
 * Determines which Java extension identifier should be used.
 * Prefers Red Hat Java when available, otherwise falls back to Oracle/GraalVM if present.
 */
export function getJavaExtensionId(extensions: { id: string }[]): string | undefined {
  if (extensions.find((extension) => extension.id === JAVA_EXTENSION_ID)) {
    return JAVA_EXTENSION_ID;
  }
  if (extensions.find((extension) => extension.id === ORACLE_JAVA_EXTENSION_ID)) {
    return ORACLE_JAVA_EXTENSION_ID;
  }
  return undefined;
}

/**
 * Maps installed extensions to the debug configuration type used by the Java debugger.
 * Returns 'jdk' for Oracle/GraalVM installs, otherwise falls back to the standard 'java' type.
 */
export function getJavaDebugConfigurationType(extensions: { id: string }[]): string {
  return extensions.find((extension) => extension.id === ORACLE_JAVA_EXTENSION_ID) ? 'jdk' : 'java';
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
