import * as vscode from 'vscode';

export type ProjectModel = {
  workflow: 'starter' | 'helloworld';
  name: string;
  artifactId: string;
  groupId: string;
  location: string;
  // Walking Skeleton Project
  vaadinVersion?: string;
  walkingSkeleton?: boolean;
  starterType?: 'flow' | 'hilla';
  // Hello World
  framework?: 'flow' | 'hilla';
  language?: 'java' | 'kotlin';
  buildTool?: 'maven' | 'gradle';
  architecture?: 'springboot' | 'quarkus' | 'jakartaee' | 'servlet';
};

// based on https://github.com/marcushellberg/luoja

export async function newProjectUserInput(): Promise<ProjectModel | undefined> {
  // Project Name
  const name = await vscode.window.showInputBox({
    prompt: 'Project Name',
    value: 'NewProject',
    validateInput: (v) => {
      if (!v.match(/^[A-Za-z0-9_.-]+$/)) {
        return 'Project name must be valid directory name.';
      }
    },
  });
  if (!name) { return; }
  // Group ID
  const groupId = await vscode.window.showInputBox({
    prompt: 'Group ID (Java package, e.g. com.example.application)',
    value: 'com.example.application',
    validateInput: (v) => {
      if (!v.match(/^(?!\.)(?!.*\.\.)(?=.*\.)([A-Za-z0-9_.]+)(?<!\.)$/)) {
        return 'Group ID must be a valid Java package name.';
      }
    },
  });
  if (!groupId) { return; }

  // Select workflow (Walking Skeleton or Hello World)
  const workflowPick = await vscode.window.showQuickPick([
    { label: 'Starter Project (minimal skeleton)', value: 'starter' },
    { label: 'Hello World Project (basic demo)', value: 'helloworld' },
  ], { placeHolder: '¿Qué tipo de proyecto Vaadin quieres crear?' });
  if (!workflowPick) { return; }
  const workflow = workflowPick.value as 'starter' | 'helloworld';

  let model: ProjectModel | undefined;
  if (workflow === 'starter') {
    model = await askForStarterOptions(name, groupId);
  } else {
    model = await askForHelloWorldOptions(name, groupId);
  }
  if (!model) { return; }

  // Folder selection (shared)
  const locationUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Project location',
    openLabel: 'Create here',
  });
  const location = locationUri ? locationUri[0].fsPath : undefined;
  if (!location) { return; }

  // Check for folder conflict and propose new name if needed (shared)
  const fs = require('fs');
  const path = require('path');
  let baseName = model.name.trim();
  let projectPath = path.join(location, baseName);
  let counter = 1;
  while (fs.existsSync(projectPath)) {
    projectPath = path.join(location, `${baseName}-${counter}`);
    counter++;
  }
  if (projectPath !== path.join(location, baseName)) {
    model.name = path.basename(projectPath);
    const answer = await vscode.window.showWarningMessage(
      `The folder '${baseName}' already exists. The project will be created as '${model.name}'. Do you want to continue?`,
      { modal: true },
      'Yes', 'No'
    );
    if (answer !== 'Yes') {
      vscode.window.showInformationMessage('Project creation cancelled.');
      return;
    }
  }
  model.artifactId = toArtifactId(model.name);
  model.location = location;
  return model;

  async function askForStarterOptions(name: string, groupId: string): Promise<ProjectModel | undefined> {
    const vaadinVersion = await vscode.window.showQuickPick([
      { label: 'Stable (LTS, recomendado)', value: 'stable' },
      { label: 'Prerelease (últimas features, puede ser inestable)', value: 'pre' },
    ], { placeHolder: 'Selecciona la versión de Vaadin' });
    if (!vaadinVersion) { return; }
    const walkingSkeleton = await vscode.window.showQuickPick([
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ], { placeHolder: '¿Incluir Walking Skeleton (estructura mínima end-to-end)?' });
    if (!walkingSkeleton) { return; }
    const starterType = await vscode.window.showQuickPick([
      { label: 'Pure Java con Vaadin Flow', value: 'flow' },
      { label: 'Full-stack React con Vaadin Hilla', value: 'hilla' },
    ], { placeHolder: 'Selecciona el tipo de starter' });
    if (!starterType) { return; }
    return {
      workflow: 'starter',
      name: name.trim(),
      artifactId: toArtifactId(name.trim()),
      groupId: groupId.trim(),
      location: '', // to be set after folder selection
      vaadinVersion: vaadinVersion.value as 'stable' | 'pre',
      walkingSkeleton: walkingSkeleton.value as boolean,
      starterType: starterType.value as 'flow' | 'hilla',
    };
  }

  async function askForHelloWorldOptions(name: string, groupId: string): Promise<ProjectModel | undefined> {
    const framework = await vscode.window.showQuickPick([
      { label: 'Flow / Java', value: 'flow' },
      { label: 'Hilla / React', value: 'hilla' },
    ], { placeHolder: 'Selecciona el framework' });
    if (!framework) { return; }
    const language = await vscode.window.showQuickPick([
      { label: 'Java', value: 'java' },
      { label: 'Kotlin', value: 'kotlin' },
    ], { placeHolder: 'Selecciona el lenguaje' });
    if (!language) { return; }
    const buildTool = await vscode.window.showQuickPick([
      { label: 'Maven', value: 'maven' },
      { label: 'Gradle', value: 'gradle' },
    ], { placeHolder: 'Selecciona el build tool' });
    if (!buildTool) { return; }
    const architecture = await vscode.window.showQuickPick([
      { label: 'Spring Boot', value: 'springboot' },
      { label: 'Quarkus', value: 'quarkus' },
      { label: 'Jakarta EE', value: 'jakartaee' },
      { label: 'Servlet', value: 'servlet' },
    ], { placeHolder: 'Selecciona la arquitectura' });
    if (!architecture) { return; }
    return {
      workflow: 'helloworld',
      name: name.trim(),
      artifactId: toArtifactId(name.trim()),
      groupId: groupId.trim(),
      location: '', // to be set after folder selection
      framework: framework.value as 'flow' | 'hilla',
      language: language.value as 'java' | 'kotlin',
      buildTool: buildTool.value as 'maven' | 'gradle',
      architecture: architecture.value as 'springboot' | 'quarkus' | 'jakartaee' | 'servlet',
    };
  }
}

function toArtifactId(name: string): string {
  return name
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
      .replace(/[\s_]+/g, '-')             // spaces/underscores to hyphen
      .replace(/[^a-zA-Z0-9-]/g, '')       // remove invalid chars
      .toLowerCase();
}
