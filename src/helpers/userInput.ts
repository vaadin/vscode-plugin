import * as vscode from 'vscode';

export type ProjectModel = {
  workflow: 'starter' | 'helloworld';
  name: string;
  artifactId: string;
  groupId: string;
  location: string;
  // Walking Skeleton Project
  vaadinVersion?: string;
  starterType?: 'flow' | 'hilla' | string;
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
    prompt: 'Project Name ',
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
    prompt: 'Group ID ',
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
    { label: 'Starter Project - Full-featured application skeleton with user management and security', value: 'starter' },
    { label: 'Hello World Project - Minimal project to get started quickly', value: 'helloworld' },
  ], { placeHolder: 'Project Type' });
  if (!workflowPick) { return; }
  const workflow = workflowPick.value as 'starter' | 'helloworld';

  // Select further options based on workflow
  let model: ProjectModel | undefined;
  if (workflow === 'starter') {
    model = await askForStarterOptions(name, groupId);
  } else {
    model = await askForHelloWorldOptions(name, groupId);
  }
  if (!model) { return; }

  // Folder selection
  const locationUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Project location',
    openLabel: 'Create here',
  });
  const location = locationUri ? locationUri[0].fsPath : undefined;
  if (!location) { return; }
  model.location = location;

  // Check for folder conflict and propose new name if needed
  const folderName = await computeFolderName(model.name, location);
  if (!folderName) {return;}
  model.name = folderName;

  model.artifactId = toArtifactId(model.name);
  return model;
}

async function askForStarterOptions(name: string, groupId: string): Promise<ProjectModel | undefined> {
  // Example views
  const exampleViews = await vscode.window.showQuickPick([
    {
      id: 'flow',
      label: 'Java UI with Vaadin Flow',
    },
    {
      id: 'hilla',
      label: 'React UI with Vaadin Hilla',
    }
  ], {
    placeHolder: 'Include Vaadin application skeleton?',
    canPickMany: true,
  });
  if (!exampleViews) { return; }

  // Version
  const vaadinVersion = await vscode.window.showQuickPick([
    { label: 'Stable', value: 'stable' },
    { label: 'Prerelease', value: 'pre' },
  ], { placeHolder: 'Select Vaadin Version' });
  if (!vaadinVersion) { return; }

  return {
    workflow: 'starter',
    name: name.trim(),
    artifactId: toArtifactId(name.trim()),
    groupId: groupId.trim(),
    location: '', // to be set after folder selection
    vaadinVersion: vaadinVersion.value as 'stable' | 'pre',
    starterType: exampleViews.map(item => item.id).join(','),
  };
}

async function askForHelloWorldOptions(name: string, groupId: string): Promise<ProjectModel | undefined> {
  // Set defaults for all options
  let language: 'java' | 'kotlin' = 'java';
  let buildTool: 'maven' | 'gradle' = 'maven';
  let architecture: 'springboot' | 'quarkus' | 'jakartaee' | 'servlet' = 'springboot';

  // Prompt for framework first
  const frameworkPick = await vscode.window.showQuickPick([
    { label: 'Flow / Java', value: 'flow' },
    { label: 'Hilla / React', value: 'hilla' },
  ], { placeHolder: 'Vaadin Framework to use' });
  if (!frameworkPick) { return; }
  const framework = frameworkPick.value as 'flow' | 'hilla';

  if (framework === 'hilla') {
    // Hilla: prompt for build tool
    const buildToolPick = await vscode.window.showQuickPick([
      { label: 'Maven', value: 'maven' },
      { label: 'Gradle', value: 'gradle' },
    ], { placeHolder: 'Build tool' });
    if (!buildToolPick) { return; }
    buildTool = buildToolPick.value as 'maven' | 'gradle';

    // Hilla: language is always Java, architecture is always Spring Boot
  } else {
    // Flow: prompt for language
    const languagePick = await vscode.window.showQuickPick([
      { label: 'Java', value: 'java' },
      { label: 'Kotlin', value: 'kotlin' },
    ], { placeHolder: 'Language' });
    if (!languagePick) { return; }
    language = languagePick.value as 'java' | 'kotlin';

    // Flow + Kotlin: build tool is always Maven, architecture is always Spring Boot (defaults)
    if (language === 'java') {
      // Flow + Java: prompt for build tool
      const buildToolPick = await vscode.window.showQuickPick([
        { label: 'Maven', value: 'maven' },
        { label: 'Gradle', value: 'gradle' },
      ], { placeHolder: 'Build tool' });
      if (!buildToolPick) { return; }
      buildTool = buildToolPick.value as 'maven' | 'gradle';

      // Flow + Java + Gradle: architecture remains Spring Boot (default)
      if (buildTool === 'maven') {
        // Flow + Java + Maven: prompt for architecture
        const architecturePick = await vscode.window.showQuickPick([
          { label: 'Spring Boot', value: 'springboot' },
          { label: 'Quarkus', value: 'quarkus' },
          { label: 'Jakarta EE', value: 'jakartaee' },
          { label: 'Servlet', value: 'servlet' },
        ], { placeHolder: 'Architecture' });
        if (!architecturePick) { return; }
        architecture = architecturePick.value as 'springboot' | 'quarkus' | 'jakartaee' | 'servlet';
      }
    }
  }

  // Return the collected model
  return {
    workflow: 'helloworld',
    name: name.trim(),
    artifactId: toArtifactId(name.trim()),
    groupId: groupId.trim(),
    location: '',
    framework,
    language,
    buildTool,
    architecture,
  };
}

async function computeFolderName(baseName: string, location: string): Promise<string | undefined> {
  const fs = require('fs');
  const path = require('path');
  let projectPath = path.join(location, baseName);
  let counter = 1;
  while (fs.existsSync(projectPath)) {
    projectPath = path.join(location, `${baseName}-${counter}`);
    counter++;
  }
  if (projectPath !== path.join(location, baseName)) {
    const newName = path.basename(projectPath);
    const answer = await vscode.window.showWarningMessage(
      `The folder '${baseName}' already exists. The project will be created as '${newName}'. Do you want to continue?`,
      { modal: true },
      'Yes'
    );
    if (answer !== 'Yes') { return; }
    return newName;
  }
  return baseName;
}

function toArtifactId(name: string): string {
  return name
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
      .replace(/[\s_]+/g, '-')             // spaces/underscores to hyphen
      .replace(/[^a-zA-Z0-9-]/g, '')       // remove invalid chars
      .toLowerCase();
}
