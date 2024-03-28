import * as vscode from 'vscode';

import { Uri } from 'vscode';
import * as fs from 'fs';
import { isFileInsideProject } from './projectFilesHelpers';

export enum Handlers {
    WRITE = "write",
    // UNDO = "undo",
    // REDO = "redo",
    SHOW_IN_IDE = "showInIde"
}

export type CommandRequest = {
    command: string,
    data: any
};

type WriteCommandData = {
    file: string,
    undoLabel: string | undefined,
    content: string
};

type UndoRedoCommandData = {
    files: string[]
};

type ShowInIdeCommandData = {
    file: string,
    line: number,
    column: number
};

export async function writeFileHandler(data: WriteCommandData) {

    if (isFileInsideProject(data.file)) {
        const visibleEditors = vscode.window.visibleTextEditors;
        
        const workspaceEdit = new vscode.WorkspaceEdit();

        const metadata = {
            label: data.undoLabel,
            needsConfirmation: false
        } as vscode.WorkspaceEditEntryMetadata;

        const uri = Uri.parse(data.file);
        const content = new TextEncoder().encode(data.content);

        if (fs.existsSync(data.file)) {
            vscode.window.visibleTextEditors;
            const entireRange = new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
            workspaceEdit.replace(uri, entireRange, data.content, metadata);
        } else {
            // cannot use createFile all the time as it creates "remove file" undo operation
            workspaceEdit.createFile(uri, { contents: content }, metadata);
        }

        // perform operation
        await vscode.workspace.applyEdit(workspaceEdit);
        
        const document = await vscode.workspace.openTextDocument(uri);
        // file should be marked as modified
        if (document.isDirty) {
            // editor is required to perform save
            const wasEditorVisible = visibleEditors.find(e => e.document === document) !== undefined;
            if (!wasEditorVisible) {
                await vscode.window.showTextDocument(uri);
            }
            await vscode.workspace.save(uri);
            if (!wasEditorVisible) {
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        }

    } else {
        console.warn("File " + data.file + " is not a part of a project");
    }
}

export async function undoRedoHandler(data: UndoRedoCommandData, operation: 'undo' | 'redo') {
    const activeDocument = vscode.window.activeTextEditor?.document;

    for (var i in data.files) {
        const file = data.files[i];
        if (isFileInsideProject(file)) {
            const uri = Uri.parse(file);
            const document = await vscode.workspace.openTextDocument(uri);
            // editor must be opened to have undo/redo context
            await vscode.window.showTextDocument(document, { preview: false });
            // undo/redo performed as standard IDE command
            await vscode.commands.executeCommand(operation);
            await vscode.workspace.save(uri);
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        } else {
            console.warn("File " + file + " is not a part of a project");
        }
    }

    if (activeDocument) {
        await vscode.window.showTextDocument(activeDocument);
    }
}

export async function showInIdeHandler(data: ShowInIdeCommandData) {
    if (isFileInsideProject(data.file)) {
        const document = await vscode.workspace.openTextDocument(Uri.parse(data.file));
        const editor = await vscode.window.showTextDocument(document, { preview: false });
        const position = new vscode.Position(data.line, data.column);
        editor.selection = new vscode.Selection(position, position);
        const range = new vscode.Range(data.line, data.column, data.line, data.column);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } else {
        console.warn("File " + data.file + " is not a part of a project");
    }
}