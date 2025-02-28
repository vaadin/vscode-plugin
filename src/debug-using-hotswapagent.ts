import * as vscode from 'vscode';
import { IMainMethod, resolveMainMethod } from './helpers/javaUtil';

export class DebugCodeLensProvider implements vscode.CodeLensProvider {
  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeLens[]> {
    try {
      const mainMethods: IMainMethod[] = await resolveMainMethod(document.uri, token);
      return mainMethods.map(
        (method) =>
          new vscode.CodeLens(method.range, {
            title: 'Debug (hotswap)',
            command: 'vaadin.debugUsingHotswap',
            tooltip: 'Debug the class using HotswapAgent',
            arguments: [true],
          }),
      );
    } catch (ex) {
      // do nothing.
      return [];
    }
  }
}
