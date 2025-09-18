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

  // Extract the zip to a temporary folder
  const tmp = require('os').tmpdir();
  const tempExtractPath = path.join(tmp, 'vaadin-tmp-' + Date.now());
  fs.mkdirSync(tempExtractPath);
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(tempExtractPath, true, true);

  // Find the root folder of the extracted project
  const extractedFolders = fs.readdirSync(tempExtractPath).filter(f => fs.statSync(path.join(tempExtractPath, f)).isDirectory());
  if (extractedFolders.length === 0) {
    throw new Error('No project folder found in the downloaded zip');
  }
  const extractedRoot = path.join(tempExtractPath, extractedFolders[0]);


  // Always use the provided model.name as the destination folder (already checked for conflicts)
  const projectPath = path.join(model.location, model.name);
  // Try to move a folder with renameSync, fallback to cpSync+rmSync if different devices in windows
  console.log(`Renaming: ${extractedRoot} -> ${projectPath}`);
  try {
    fs.renameSync(extractedRoot, projectPath);
  } catch (err: any) {
    fs.cpSync(extractedRoot, projectPath, { recursive: true });
    fs.rmSync(extractedRoot, { recursive: true, force: true });
  }

  // Clean up temporary folder
  fs.rmSync(tempExtractPath, { recursive: true, force: true });

  console.log('Vaadin project created at ' + projectPath);

  // Open the newly created project folder in a new VS Code window, unless running in test mode
  if (process.env.NODE_ENV !== 'test' && process.env.VSCODE_TEST !== 'true') {
    const uri = vscode.Uri.file(projectPath);
    vscode.commands.executeCommand('vscode.openFolder', uri, true);
  }
}

function getDownloadUrl(model: ProjectModel) {
    if (model.workflow === 'starter') {
      // Walking Skeleton Project
      const params = new URLSearchParams({
        name: model.name,
        artifactId: model.artifactId,
        groupId: model.groupId,
        framework: model.starterType || 'flow',
        language: 'java',
        buildtool: 'maven',
        stack: 'springboot',
        version: model.vaadinVersion || 'stable',
        download: 'true',
        ref: 'vscode-plugin',
      }).toString();
      return `https://start.vaadin.com/skeleton?${params}`;
    } else {
      // Hello World Project
      const params = new URLSearchParams({
        name: model.name,
        artifactId: model.artifactId,
        groupId: model.groupId,
        framework: model.framework || 'flow',
        language: model.language || 'java',
        buildtool: model.buildTool || 'maven',
        stack: model.architecture || 'springboot',
        download: 'true',
        ref: 'vscode-plugin',
      }).toString();
      return `https://start.vaadin.com/helloworld?${params}`;
    }
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
