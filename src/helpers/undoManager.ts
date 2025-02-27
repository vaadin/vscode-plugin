import { TextDocument } from "vscode";

type Operation = "undo" | "redo";

/**
 * Undo Manager tracks file changes done by user and plugin
 * allowing to perform undo or redo operations.
 *
 */
export class UndoManager {
  private undos: Map<string, number> = new Map();
  private redos: Map<string, number> = new Map();
  private locks: Set<string> = new Set();

  // listener clearing document counters on user file save
  public documentSaveListener(doc: TextDocument) {
    // check if document is locked by plugin operation
    if (this.isLocked(doc)) {
      return;
    }

    this.undos.delete(this.getKey(doc));
    this.redos.delete(this.getKey(doc));
  }

  // prevents clearing counters on plugin operations
  public lockDocument(doc: TextDocument) {
    if (this.isLocked(doc)) {
      console.warn("Already locked " + doc.uri);
      return;
    }
    this.locks.add(this.getKey(doc));
  }

  // unlock document after plugin operation has been finished
  public unlockDocument(doc: TextDocument) {
    if (!this.isLocked(doc)) {
      console.warn("Not locked " + doc.uri);
      return;
    }
    this.locks.delete(this.getKey(doc));
  }

  private isLocked(doc: TextDocument): boolean {
    return this.locks.has(this.getKey(doc));
  }

  // update counters after file saved via plugin
  public pluginFileWritten(doc: TextDocument) {
    // increment undo counter on file save
    this.increment(doc, "undo");

    // set redo to 0
    this.redos.set(this.getKey(doc), 0);
  }

  // update counters after undo or redo performed via plugin
  public pluginUndoRedoPerformed(doc: TextDocument, op: Operation) {
    // decrement undo counter for undo, redo for redo
    this.decrement(doc, op === "undo" ? "undo" : "redo");

    // increment redo counter undo, undo counter for redo
    this.increment(doc, op === "undo" ? "redo" : "undo");
  }

  // checks if undo redo can be performed
  public canUndoRedo(doc: TextDocument, op: Operation): boolean {
    const key = this.getKey(doc);
    const map = op === "undo" ? this.undos : this.redos;
    return map.has(key) ? map.get(key)! > 0 : false;
  }

  private increment(doc: TextDocument, op: Operation) {
    const key = this.getKey(doc);
    const map = op === "undo" ? this.undos : this.redos;
    const value = map.get(key) ?? 0;
    map.set(key, value + 1);
  }

  private decrement(doc: TextDocument, op: Operation) {
    const key = this.getKey(doc);
    const map = op === "undo" ? this.undos : this.redos;
    const value = map.get(key);
    if (value !== undefined) {
      map.set(key, value - 1);
    }
  }

  private getKey(doc: TextDocument): string {
    return doc.uri.fsPath;
  }
}

export const undoManager = new UndoManager();
