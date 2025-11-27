import * as vscode from 'vscode';

import { Uri } from 'vscode';
import * as fs from 'fs';
import { isFileInsideProject } from './projectFilesHelpers';
import { undoManager } from './undoManager';
import { focusWindow } from './ideUtils';

export enum Handlers {
  WRITE = 'write',
  WRITE_BASE64 = 'writeBase64',
  UNDO = 'undo',
  REDO = 'redo',
  SHOW_IN_IDE = 'showInIde',
  REFRESH = 'refresh',
}

export type CommandRequest = {
  command: string;
  data: any;
};

type WriteCommandData = {
  file: string;
  undoLabel: string | undefined;
  content: string;
};

type UndoRedoCommandData = {
  files: string[];
};

type ShowInIdeCommandData = {
  file: string;
  line: number;
  column: number;
};

type BinaryHistory = {
  undoStack: Buffer[];
  redoStack: Buffer[];
};

// Track previous binary content so base64 writes can be undone without deleting files.
const base64History: Map<string, BinaryHistory> = new Map();

export async function writeFileHandler(data: WriteCommandData) {
  if (isFileInsideProject(data.file)) {
    const workspaceEdit = new vscode.WorkspaceEdit();

    const metadata = {
      label: data.undoLabel,
      needsConfirmation: false,
    } as vscode.WorkspaceEditEntryMetadata;

    const uri = Uri.file(data.file);
    const content = new TextEncoder().encode(data.content);

    if (fs.existsSync(data.file)) {
      const currentContent = fs.readFileSync(data.file);
      if (currentContent.equals(content)) {
        console.log('File ' + uri + ' unchanged, not saving');
        return;
      }
      vscode.window.visibleTextEditors;
      const entireRange = new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      workspaceEdit.replace(uri, entireRange, data.content, metadata);
      console.log('Replacing content of ' + uri);
    } else {
      // cannot use createFile all the time as it creates "remove file" undo operation
      workspaceEdit.createFile(uri, { contents: content }, metadata);
      console.log('Saving content in ' + uri);
    }

    // perform operation
    await vscode.workspace.applyEdit(workspaceEdit);

    // save changes
    vscode.workspace.openTextDocument(uri).then((doc) => {
      undoManager.lockDocument(doc);
      doc.save().then((result) => {
        if (result) {
          undoManager.pluginFileWritten(doc);
        }
        undoManager.unlockDocument(doc);
      });
      vscode.window.showTextDocument(doc);
    });
  } else {
    console.warn('File ' + data.file + ' is not a part of a project');
  }
}

export async function writeBase64FileHandler(data: WriteCommandData) {
  if (isFileInsideProject(data.file)) {
    const uri = Uri.file(data.file);
    const newContent = Buffer.from(data.content, 'base64');
    const fileExists = fs.existsSync(data.file);
    if (fileExists) {
      const currentContent = fs.readFileSync(data.file);
      if (currentContent.equals(newContent)) {
        console.log('File ' + uri + ' unchanged, not saving');
        return;
      }
      const history = base64History.get(data.file) ?? { undoStack: [], redoStack: [] };
      history.undoStack.push(currentContent);
      history.redoStack = [];
      base64History.set(data.file, history);
    }
    const metadata = {
      label: data.undoLabel,
      needsConfirmation: false,
    } as vscode.WorkspaceEditEntryMetadata;

    const workspaceEdit = new vscode.WorkspaceEdit();

    // Use workspace edit to keep the binary write on VS Code's undo stack.
    workspaceEdit.createFile(uri, { contents: newContent, overwrite: true }, metadata);
    const applied = await vscode.workspace.applyEdit(workspaceEdit);
    if (!applied) {
      console.warn('Could not apply workspace edit for ' + uri);
      return;
    }

    try {
      // Save via VS Code to keep undo stack and UndoManager counters in sync.
      const doc = await vscode.workspace.openTextDocument(uri);
      undoManager.lockDocument(doc);
      try {
        const result = await doc.save();
        if (result) {
          undoManager.pluginFileWritten(doc);
        }
      } finally {
        undoManager.unlockDocument(doc);
      }
    } catch (error) {
      console.warn('Cannot open ' + uri + ' for undo tracking: ' + error);
    }
  } else {
    console.warn('File ' + data.file + ' is not a part of a project');
  }
}

export async function undoRedoHandler(data: UndoRedoCommandData, operation: 'undo' | 'redo') {
  const activeDocument = vscode.window.activeTextEditor?.document;

  for (var i in data.files) {
    const file = data.files[i];
    if (isFileInsideProject(file)) {
      const uri = Uri.file(file);
      const document = await vscode.workspace.openTextDocument(uri);
      if (!undoManager.canUndoRedo(document, operation)) {
        continue;
      }
      // For base64 writes rely on stored snapshots instead of VS Code text undo stack.
      const history = base64History.get(file);
      const manualStack = history ? (operation === 'undo' ? history.undoStack : history.redoStack) : undefined;
      if (manualStack && manualStack.length > 0) {
        const targetContent = manualStack.pop()!;
        const oppositeStack = operation === 'undo' ? history!.redoStack : history!.undoStack;
        const currentContent = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
        oppositeStack.push(currentContent);

        const binaryEdit = new vscode.WorkspaceEdit();
        binaryEdit.createFile(uri, { contents: targetContent, overwrite: true });
        const applied = await vscode.workspace.applyEdit(binaryEdit);
        if (!applied) {
          console.warn('Could not apply binary ' + operation + ' for ' + uri);
          continue;
        }

        const docToSave = await vscode.workspace.openTextDocument(uri);
        undoManager.lockDocument(docToSave);
        try {
          const saved = await docToSave.save();
          if (saved) {
            undoManager.pluginUndoRedoPerformed(docToSave, operation);
          }
        } finally {
          undoManager.unlockDocument(docToSave);
        }
        await vscode.window.showTextDocument(document, { preview: false });
        continue;
      }
      // editor must be opened to have undo/redo context
      await vscode.window.showTextDocument(document, { preview: false });
      // undo/redo performed as standard IDE command
      await vscode.commands.executeCommand(operation);
      vscode.workspace.openTextDocument(uri).then((doc) => {
        undoManager.lockDocument(doc);
        doc.save().then((result) => {
          if (result) {
            undoManager.pluginUndoRedoPerformed(document, operation);
          }
          undoManager.unlockDocument(doc);
        });
      });
    } else {
      console.warn('File ' + file + ' is not a part of a project');
    }
  }

  if (activeDocument) {
    await vscode.window.showTextDocument(activeDocument);
  }
}

// not used temporarily as it does not bring Window to front
export async function showInIdeHandler(data: ShowInIdeCommandData) {
  if (isFileInsideProject(data.file)) {
    const document = await vscode.workspace.openTextDocument(Uri.file(data.file));
    const editor = await vscode.window.showTextDocument(document, {
      preview: false,
    });
    const position = new vscode.Position(data.line, data.column);
    editor.selection = new vscode.Selection(position, position);
    const range = new vscode.Range(data.line, data.column, data.line, data.column);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    console.log('Opening document ' + data.file + ' at ' + data.line + ':' + data.column);
    focusWindow();
  } else {
    console.warn('File ' + data.file + ' is not a part of a project');
  }
}

export async function refresh() {
  vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
}
