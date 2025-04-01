import * as vscode from 'vscode';

export type ProjectModel = {
  name: string;
  artifactId: string;
  location: string;
  frameworks: string;
  version: string;
};

// based on https://github.com/marcushellberg/luoja
export async function newProjectUserInput(): Promise<ProjectModel | undefined> {
  // Project name
  const name = await vscode.window.showInputBox({
    prompt: 'Project Name',
    value: 'New Project',
    validateInput: (v) => {
      if (!v.match(/^[^\.].*[^\.]$/)) {
        return 'Project name must be valid directory name.';
      }
    },
  });
  if (!name) {
    return;
  }

  // Example views
  const exampleViews = await vscode.window.showQuickPick([
    { 
      id: 'flow',
      label: 'Java with Vaadin Flow',
    },
    {
      id: 'hilla',
      label: 'Full-stack React with Vaadin Hilla',
    }
    ], {
    placeHolder: 'Include Vaadin views?',
    canPickMany: true,
  });
  if (!exampleViews) {
    return;
  }

  // Version
  const version = await vscode.window.showQuickPick(['Stable', 'Prerelease'], {
    placeHolder: 'Select a Version',
  });
  if (!version) {
    return;
  }

  // Project location
  const locationUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Project location',
    openLabel: 'Create here',
  });
  const location = locationUri ? locationUri[0].fsPath : undefined;
  if (!location) {
    return;
  }

  return {
    name: name.trim(),
    artifactId: toArtifactId(name),
    location,
    frameworks: exampleViews.map(item => item.id).join(','),
    version,
  };
}

function toArtifactId(name: string): string {
  return name
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
      .replace(/[\s_]+/g, '-')             // spaces/underscores to hyphen
      .replace(/[^a-zA-Z0-9-]/g, '')       // remove invalid chars
      .toLowerCase();
}
