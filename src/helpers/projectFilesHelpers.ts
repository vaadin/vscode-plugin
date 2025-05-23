import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ProjectModel } from './userInput';
import AdmZip from 'adm-zip';
import { trackProjectCreated } from './ampliUtil';

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
    const resolvedFile = path.resolve(file).toLocaleLowerCase('en');
    return resolvedFile.startsWith(projectRoot.toLocaleLowerCase('en'));
  } else {
    return isFileInsideProject(path.dirname(file));
  }
}

export async function downloadAndExtract(model: ProjectModel) {
  const url = getDownloadUrl(model);
  console.log('Downloading Vaadin project from ' + url);

  trackProjectCreated(url);

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const zipBuffer = Buffer.from(response.data, 'binary');

  const generatedProjectPath = path.join(model.location, model.artifactId);
  const projectPath = path.join(model.location, model.name);

  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(model.location, true, true);

  // use project name from user input for project location
  fs.renameSync(generatedProjectPath, projectPath);

  console.log('Vaadin project created at ' + projectPath);

  // Open the newly created project folder in a new VS Code window
  const uri = vscode.Uri.file(projectPath);
  vscode.commands.executeCommand('vscode.openFolder', uri, true);
}

function getDownloadUrl(model: ProjectModel) {
  let frameworks = model.frameworks === '' ? 'empty' : model.frameworks;
  let platformVersion = model.version === 'Stable' ? 'stable' : 'pre';

  let params = new URLSearchParams({
    frameworks,
    platformVersion,
    artifactId: model.artifactId,
    ref: 'vscode'
  }).toString();

  return `https://start.vaadin.com/skeleton?${params}`;
}

/**
 * Resolves the Vaadin home directory (`~/.vaadin`).
 * Ensures the directory exists before returning it.
 * @returns The path to the `.vaadin` directory.
 */
export function resolveVaadinHomeDirectory(): string {
  const userHome = process.env.HOME || process.env.USERPROFILE; // Cross-platform user home directory
  if (!userHome) {
    throw new Error('Unable to determine user home directory.');
  }

  const vaadinHome = path.join(userHome, '.vaadin');

  // Ensure the directory exists
  try {
    fs.accessSync(vaadinHome);
  } catch {
    fs.mkdirSync(vaadinHome);
  }

  return vaadinHome;
}
