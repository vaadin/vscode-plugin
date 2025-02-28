import * as vscode from 'vscode';
import * as _ from "lodash";

export interface IMainClassOption {
  readonly mainClass: string;
  readonly projectName?: string;
  readonly filePath?: string;
}

export interface IMainMethod extends IMainClassOption {
  range: vscode.Range;
}

const JAVA_EXTENSION_ID = "redhat.java";
export const JAVA_EXECUTE_WORKSPACE_COMMAND = "java.execute.workspaceCommand";

export function getJavaExtension(): vscode.Extension<any> | undefined {
    return vscode.extensions.getExtension(JAVA_EXTENSION_ID);
}
export const JAVA_RESOLVE_MAINMETHOD = "vscode.java.resolveMainMethod";
export function executeJavaLanguageServerCommand(...rest: any[]) {
    return executeJavaExtensionCommand(JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
}

export async function executeJavaExtensionCommand(commandName: string, ...rest: any[]) {
    // TODO: need to handle error and trace telemetry
    const javaExtension = getJavaExtension();
    if (!javaExtension) {
        throw new Error(`Cannot execute command ${commandName}, VS Code Java Extension is not enabled.`);
    }
    if (!javaExtension?.isActive) {
        await javaExtension.activate();
    }
    return vscode.commands.executeCommand(commandName, ...rest);
}
export async function resolveMainMethod(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<IMainMethod[]> {
  if (token) {
    return <IMainMethod[]>(
      await executeJavaLanguageServerCommand(JAVA_RESOLVE_MAINMETHOD, uri.toString(), token)
    );
  }

  return <IMainMethod[]>(
    await executeJavaLanguageServerCommand(JAVA_RESOLVE_MAINMETHOD, uri.toString())
  );
}

export class DebugCodeLensProvider implements vscode.CodeLensProvider {
  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeLens[]> {
    try {
      const mainMethods: IMainMethod[] = await resolveMainMethod(document.uri, token);

      return _.flatten(mainMethods.map((method) => {
        return [
            new vscode.CodeLens(method.range, {
              title: 'Debug (hotswap)',
              command: 'vaadin.debugUsingHotswap',
              tooltip: 'Debug the class using HotswapAgent',
              arguments: [method.mainClass, method.projectName, document.uri],
            }),
          ];
        }),
      );
    } catch (ex) {
      // do nothing.
      return [];
    }
  }
}
