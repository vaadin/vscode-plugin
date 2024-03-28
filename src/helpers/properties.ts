import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { PropertiesEditor } from 'properties-file/editor'
import { getProjectFilePath, projectPathExists } from './projectFilesHelpers';
import { Handlers } from './handlers';

export function saveProperties(port: Number) {
	const vsFs = vscode.workspace.fs;
	const dotDir = Uri.parse(getProjectFilePath('.vscode')!);
	if (!projectPathExists('.vscode')) {
		vsFs.createDirectory(dotDir);
		console.log(dotDir.fsPath + ' created');
	}
	const pluginDotFile = Uri.joinPath(dotDir, '.copilot-plugin');
	const properties = createProperties(port);
	vsFs.writeFile(pluginDotFile, Buffer.from(properties.format()));
}

export function deleteProperties() {
	if (projectPathExists('.vscode', '.copilot-plugin')) {
		const pluginDotFile = Uri.parse(getProjectFilePath('.vscode', '.copilot-plugin')!);
		vscode.workspace.fs.delete(pluginDotFile);
	}
}

function createProperties(port: Number): PropertiesEditor {
	const editor = new PropertiesEditor('# Vaadin Copilot Integration Runtime Properties');
	editor.insertComment(new Date().toUTCString());
	editor.insert('ide', 'vscode');
	editor.insert('port', port.toString());
	editor.insert('version', getPluginVersion());
	editor.insert('supportedActions', Object.values(Handlers).join(','));
	return editor
}

function getPluginVersion(): string {
	return vscode.extensions.getExtension('vaadin.vaadin')!.packageJSON.version
}