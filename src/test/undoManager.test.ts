import * as assert from "assert";

import * as vscode from "vscode";
import { UndoManager } from "../helpers/undoManager";

const openDoc = vscode.workspace.openTextDocument(
  vscode.workspace.workspaceFile!,
);

suite("Undo Manager Test Suite", () => {
  vscode.window.showInformationMessage("Start Undo Manager tests.");

  test("Cannot undo redo on fresh file", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    assert.equal(undoManager.canUndoRedo(doc, "undo"), false);
    assert.equal(undoManager.canUndoRedo(doc, "redo"), false);
  });

  test("Cannot undo redo after user operation", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.documentSaveListener(doc);
    assert.equal(undoManager.canUndoRedo(doc, "undo"), false);
    assert.equal(undoManager.canUndoRedo(doc, "redo"), false);
  });

  test("Can undo and not redo after single plugin write operation", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.pluginFileWritten(doc);
    assert.equal(undoManager.canUndoRedo(doc, "undo"), true);
    assert.equal(undoManager.canUndoRedo(doc, "redo"), false);
  });

  test("Can redo after undo", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.pluginFileWritten(doc);
    undoManager.pluginUndoRedoPerformed(doc, "undo");
    assert.equal(undoManager.canUndoRedo(doc, "redo"), true);
  });

  test("Cannot undo redo after user alters file content", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.pluginFileWritten(doc);
    undoManager.documentSaveListener(doc);
    assert.equal(undoManager.canUndoRedo(doc, "undo"), false);
    assert.equal(undoManager.canUndoRedo(doc, "redo"), false);
  });

  test("Locked file prevents counters clearing", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.lockDocument(doc);
    undoManager.pluginFileWritten(doc);
    undoManager.documentSaveListener(doc);
    assert.equal(undoManager.canUndoRedo(doc, "undo"), true);
  });

  test("Cannot undo if counter is 0", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.pluginFileWritten(doc);
    assert.equal(undoManager.canUndoRedo(doc, "undo"), true);
    undoManager.pluginUndoRedoPerformed(doc, "undo");
    assert.equal(undoManager.canUndoRedo(doc, "undo"), false);
  });

  test("Cannot redo if counter is 0", async () => {
    const undoManager = new UndoManager();
    const doc = await openDoc;
    undoManager.pluginFileWritten(doc);
    undoManager.pluginUndoRedoPerformed(doc, "undo");
    assert.equal(undoManager.canUndoRedo(doc, "redo"), true);
    undoManager.pluginUndoRedoPerformed(doc, "redo");
    assert.equal(undoManager.canUndoRedo(doc, "redo"), false);
  });
});
