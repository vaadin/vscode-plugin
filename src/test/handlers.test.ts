import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { writeFileHandler } from '../helpers/handlers';

suite('Handlers writeFileHandler unsaved changes', () => {
  const testDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaadin-handler-tests-'));
  const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
  let originalWarning: typeof vscode.window.showWarningMessage;
  const createdFiles: string[] = [];

  suiteSetup(async () => {
    const added = vscode.workspace.updateWorkspaceFolders(0, originalWorkspaceFolders?.length ?? 0, {
      uri: vscode.Uri.file(testDir),
      name: 'handler-tests',
    });
    if (!added) {
      throw new Error('Failed to add handler test workspace folder');
    }
    // allow VS Code to register the new workspace folder
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  suiteTeardown(() => {
    vscode.workspace.updateWorkspaceFolders(
      0,
      vscode.workspace.workspaceFolders?.length ?? 0,
      ...(originalWorkspaceFolders ?? []),
    );
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  setup(() => {
    originalWarning = vscode.window.showWarningMessage;
    fs.mkdirSync(testDir, { recursive: true });

    // Clean any files left from previous test run
    for (const entry of fs.readdirSync(testDir)) {
      fs.rmSync(path.join(testDir, entry), { recursive: true, force: true });
    }
  });

  teardown(() => {
    vscode.window.showWarningMessage = originalWarning;
    createdFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { force: true });
      }
    });
    createdFiles.splice(0, createdFiles.length);
  });

  async function createDirtyDocument(fileName: string) {
    const filePath = path.join(testDir, fileName);
    fs.writeFileSync(filePath, 'original');
    createdFiles.push(filePath);

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc);

    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(doc.lineCount, 0), 'unsaved-change\n');
    await vscode.workspace.applyEdit(edit);

    assert.ok(doc.isDirty, 'Document should be dirty for the test setup');
    return { filePath, doc };
  }

  async function waitForFileContent(filePath: string, expected: string) {
    for (let i = 0; i < 40; i++) {
      if (fs.readFileSync(filePath, 'utf-8') === expected) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Timed out waiting for ${filePath} to contain expected content`);
  }

  async function waitForNotDirty(doc: vscode.TextDocument) {
    for (let i = 0; i < 40; i++) {
      const refreshed = await vscode.workspace.openTextDocument(doc.uri);
      if (!refreshed.isDirty) {
        return refreshed;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Document ${doc.uri.fsPath} stayed dirty longer than expected`);
  }

  test('does not overwrite when user cancels dirty file prompt', async () => {
    const { filePath, doc } = await createDirtyDocument('cancel.txt');
    let promptShown = false;

    vscode.window.showWarningMessage = async () => {
      promptShown = true;
      return 'Cancel' as any;
    };

    await writeFileHandler({ file: filePath, undoLabel: undefined, content: 'incoming' });

    assert.ok(promptShown, 'Prompt should be shown for dirty file');
    assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), 'original', 'Disk content should remain unchanged');
    assert.ok(doc.isDirty, 'Document should remain dirty after cancelling');
  });

  test('saves dirty document before applying changes when user chooses save and apply', async () => {
    const { filePath } = await createDirtyDocument('save-and-apply.txt');
    let promptShown = false;

    vscode.window.showWarningMessage = async () => {
      promptShown = true;
      return 'Save and apply' as any;
    };

    await writeFileHandler({ file: filePath, undoLabel: 'test', content: 'new content' });
    await waitForFileContent(filePath, 'new content');

    const refreshed = await waitForNotDirty(await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)));
    assert.ok(promptShown, 'Prompt should be shown for dirty file');
    assert.strictEqual(refreshed.getText(), 'new content', 'File should contain handler content after save');
    assert.strictEqual(refreshed.isDirty, false, 'Document should be clean after handler finishes');
  });

  test('applies changes without saving existing edits when user chooses apply without saving', async () => {
    const { filePath } = await createDirtyDocument('apply-without-saving.txt');
    let promptShown = false;

    vscode.window.showWarningMessage = async () => {
      promptShown = true;
      return 'Apply without saving' as any;
    };

    await writeFileHandler({ file: filePath, undoLabel: 'test', content: 'override content' });
    await waitForFileContent(filePath, 'override content');

    const refreshed = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    assert.ok(promptShown, 'Prompt should be shown for dirty file');
    assert.strictEqual(refreshed.getText(), 'override content', 'Handler should overwrite with provided content');
    assert.strictEqual(refreshed.isDirty, false, 'Document should be saved after handler write');
  });
});
