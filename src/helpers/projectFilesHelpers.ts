import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function getProjectFilePath(...parts: string[]) {
  if (vscode.workspace.workspaceFolders) {
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, ...parts);
  }
}

export function projectPathExists(...parts: string[]) {
  // check if the user has any folders open in their workspace
  // if yes, take the first one since we are not supporting multiple
  // workspace folders
  if (vscode.workspace.workspaceFolders) {
    return fs.existsSync(getProjectFilePath(...parts)!);
  }

  // return false if no workspace folder is opened
  return false;
}

export function readProjectFile(...parts: string[]): string | undefined {
  if (projectPathExists(...parts)) {
    return fs.readFileSync(getProjectFilePath(...parts)!, 'utf-8');
  }
}

export function isFileInsideProject(file: string): boolean {
    const projectRoot = getProjectFilePath()!;
    if (fs.existsSync(file)) {
        return path.resolve(file).startsWith(projectRoot);
    } else {
        return isFileInsideProject(path.dirname(file));
    }
}
