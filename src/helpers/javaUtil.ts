import * as vscode from 'vscode';

export const JAVA_DEBUG_CONFIGURATION = 'java.debug.settings';
export const JAVA_LANGID: string = 'java';
export const ORACLE_JAVA_EXTENSION_ID = 'oracle.oracle-java';

const JAVA_EXTENSION_ID = 'redhat.java';
const JAVA_EXECUTE_WORKSPACE_COMMAND = 'java.execute.workspaceCommand';
const JAVA_RESOLVE_MAINMETHOD = 'vscode.java.resolveMainMethod';

type JavaDebugConfigurationType = 'java' | 'jdk';

interface JavaExtensionCandidate {
  id: string;
  debugConfigurationType: JavaDebugConfigurationType;
  supportsWorkspaceCommandExecution: boolean;
}

// Keep the supported extensions in priority order so detection stays predictable.
const SUPPORTED_JAVA_EXTENSIONS: JavaExtensionCandidate[] = [
  {
    id: JAVA_EXTENSION_ID,
    debugConfigurationType: 'java',
    supportsWorkspaceCommandExecution: true,
  },
  {
    id: ORACLE_JAVA_EXTENSION_ID,
    debugConfigurationType: 'jdk',
    supportsWorkspaceCommandExecution: false,
  },
];

export interface IMainClassOption {
  readonly mainClass: string;
  readonly projectName?: string;
  readonly filePath?: string;
}

export interface IMainMethod extends IMainClassOption {
  range: vscode.Range;
}

export async function resolveMainMethod(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<IMainMethod[]> {
  const javaExtension = getJavaExtensionDetails();
  if (javaExtension?.supportsWorkspaceCommandExecution) {
    if (token) {
      return <IMainMethod[]>await executeJavaLanguageServerCommand(JAVA_RESOLVE_MAINMETHOD, uri.toString(), token);
    }
    return <IMainMethod[]>await executeJavaLanguageServerCommand(JAVA_RESOLVE_MAINMETHOD, uri.toString());
  }

  return resolveMainMethodsWithoutJavaExtension(uri);
}

export function getJavaExtension(): vscode.Extension<any> | undefined {
  const javaExtension = getJavaExtensionDetails();
  return javaExtension ? vscode.extensions.getExtension(javaExtension.id) : undefined;
}

export function executeJavaLanguageServerCommand(...rest: any[]) {
  return executeJavaExtensionCommand(JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
}

export async function executeJavaExtensionCommand(commandName: string, ...rest: any[]) {
  const javaExtension = getJavaExtensionDetails();
  if (!javaExtension?.supportsWorkspaceCommandExecution) {
    console.warn(`Cannot execute command ${commandName}, supported Java extension is not enabled.`);
    return;
  }
  const extension = getJavaExtension();
  if (!extension?.isActive) {
    await extension?.activate();
  }
  return vscode.commands.executeCommand(commandName, ...rest);
}

export function getJavaDebugConfigurationType(
  availableExtensions: readonly Pick<vscode.Extension<any>, 'id'>[] = vscode.extensions.all,
): JavaDebugConfigurationType {
  const javaExtension = getJavaExtensionDetails(availableExtensions);
  return javaExtension?.debugConfigurationType || 'java';
}

export function getJavaExtensionId(
  availableExtensions: readonly Pick<vscode.Extension<any>, 'id'>[] = vscode.extensions.all,
): string | undefined {
  return getJavaExtensionDetails(availableExtensions)?.id;
}

function getJavaExtensionDetails(
  availableExtensions: readonly Pick<vscode.Extension<any>, 'id'>[] = vscode.extensions.all,
): JavaExtensionCandidate | undefined {
  // Prefer the order in SUPPORTED_JAVA_EXTENSIONS so we stay predictable when multiple Java extensions are installed.
  return SUPPORTED_JAVA_EXTENSIONS.find((candidate) =>
    availableExtensions.some((extension) => extension.id === candidate.id),
  );
}

async function resolveMainMethodsWithoutJavaExtension(uri: vscode.Uri): Promise<IMainMethod[]> {
  // Fallback to lightweight parsing when the Java extension cannot resolve main methods for us.
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const text = document.getText();
    const mainRange = findMainMethodRange(document, text);
    if (!mainRange) {
      return [];
    }
    const mainClass = inferMainClassName(uri, text);
    return [{ mainClass, range: mainRange }];
  } catch (error) {
    console.warn('Unable to resolve main method without Java extension', error);
    return [];
  }
}

function findMainMethodRange(document: vscode.TextDocument, text: string): vscode.Range | undefined {
  // Lightweight main method detection for environments where the Java extension command is unavailable.
  const mainMethodRegex = /public\s+static\s+void\s+main\s*\(\s*String(?:\s*\[\s*\]|\s+\.{3}|\s+\[\s*\])\s+[A-Za-z_][A-Za-z0-9_]*\s*\)/m;
  const match = mainMethodRegex.exec(text);
  if (!match) {
    return;
  }
  const start = document.positionAt(match.index);
  const end = document.positionAt(match.index + match[0].length);
  return new vscode.Range(start, end);
}

function inferMainClassName(uri: vscode.Uri, text: string): string {
  const className = uri.path ? uri.path.split('/').pop()?.replace('.java', '') : 'Main';
  const packageMatch = text.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
  if (!packageMatch || !packageMatch[1]) {
    return className || 'Main';
  }
  return `${packageMatch[1]}.${className}`;
}
