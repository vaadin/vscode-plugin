import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { undoRedoHandler, writeBase64FileHandler } from '../helpers/handlers';
import { undoManager } from '../helpers/undoManager';
import { isFileInsideProject } from '../helpers/projectFilesHelpers';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForCondition(predicate: () => boolean, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await wait(25);
  }
  assert.fail('Timed out waiting for condition');
}

async function waitForFileContent(filePath: string, expected: Buffer, timeoutMs = 2000) {
  // Writes and undo/redo saves happen asynchronously, so wait until disk matches expectation.
  await waitForCondition(() => fs.existsSync(filePath) && fs.readFileSync(filePath).equals(expected), timeoutMs);
}

suite('writeBase64 undo/redo support', function () {
  this.timeout(10000);
  const tempWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vaadin-handler-tests-'));
  const workspaceUri = vscode.Uri.file(tempWorkspaceDir);
  let originalFolders: readonly vscode.WorkspaceFolder[] | undefined;

  suiteSetup(() => {
    originalFolders = vscode.workspace.workspaceFolders;
    fs.mkdirSync(tempWorkspaceDir, { recursive: true });
    // Attach an isolated workspace folder so isFileInsideProject passes for test files.
    const added = vscode.workspace.updateWorkspaceFolders(
      0,
      originalFolders?.length ?? 0,
      { uri: workspaceUri },
    );
    if (!added) {
      throw new Error('Failed to set test workspace folder');
    }
  });

  suiteTeardown(() => {
    const foldersToRestore = originalFolders?.map((folder) => ({ uri: folder.uri, name: folder.name })) ?? [];
    vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length ?? 0, ...foldersToRestore);
    fs.rmSync(tempWorkspaceDir, { recursive: true, force: true });
  });

  test('supports undo and redo after base64 write', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Workspace folder should be available');
    assert.ok(fs.existsSync(workspaceFolder.uri.fsPath), 'Workspace path should exist on disk');

    const filePath = path.join(workspaceFolder.uri.fsPath, 'base64-undo.txt');
    const originalContent = 'initial base64 content';
    const updatedContent = 'updated by base64 handler';

    fs.writeFileSync(filePath, originalContent);
    assert.ok(fs.existsSync(filePath), 'Base64 test file should exist after seed write');
    assert.ok(isFileInsideProject(filePath), 'Test file should be inside the workspace project');

    await writeBase64FileHandler({
      file: filePath,
      content: Buffer.from(updatedContent).toString('base64'),
      undoLabel: 'Base64 write',
    });
    assert.ok(fs.existsSync(filePath), 'Base64 test file should exist after handler write');

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    assert.strictEqual(fs.readFileSync(filePath, 'utf8'), updatedContent);

    await waitForCondition(() => undoManager.canUndoRedo(document, 'undo'));

    await undoRedoHandler({ files: [filePath] }, 'undo');

    await waitForFileContent(filePath, Buffer.from(originalContent), 5000);
    await waitForCondition(() => undoManager.canUndoRedo(document, 'redo'));

    await undoRedoHandler({ files: [filePath] }, 'redo');

    await waitForFileContent(filePath, Buffer.from(updatedContent), 5000);
  });
});
