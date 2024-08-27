import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { PropertiesEditor } from 'properties-file/editor';
import { getProjectFilePath, projectPathExists } from './projectFilesHelpers';
import { Handlers } from './handlers';

export function saveProperties(endpoint: string) {
	const vsFs = vscode.workspace.fs;
	const dotDir = Uri.file(getProjectFilePath('.vscode')!);
	if (!projectPathExists('.vscode')) {
		vsFs.createDirectory(dotDir);
		console.log(dotDir.fsPath + ' created');
	}
	const pluginDotFile = Uri.joinPath(dotDir, '.copilot-plugin');
	const properties = createProperties(endpoint);
	vsFs.writeFile(pluginDotFile, Buffer.from(properties.format()));
}

export function deleteProperties() {
	if (projectPathExists('.vscode', '.copilot-plugin')) {
		const pluginDotFile = Uri.file(getProjectFilePath('.vscode', '.copilot-plugin')!);
		vscode.workspace.fs.delete(pluginDotFile);
	}
}

function createProperties(endpoint: string): PropertiesEditor {
	const editor = new PropertiesEditor('# Vaadin Copilot Integration Runtime Properties');
	editor.insertComment(new Date().toUTCString());
	editor.insert('ide', 'vscode');
	editor.insert('endpoint', endpoint);
	editor.insert('version', getPluginVersion());
	editor.insert('supportedActions', Object.values(Handlers).join(','));
	return editor;
}

function getPluginVersion(): string {
	return vscode.extensions.getExtension('vaadin.vaadin-vscode')!.packageJSON.version;
}
