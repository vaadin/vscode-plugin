import * as vscode from 'vscode';
import { downloadAndExtract, projectPathExists, readProjectFile } from './helpers/projectFilesHelpers';
import { statusBarItem, startServer } from './helpers/server';
import { newProjectUserInput } from './helpers/userInput';
import { undoManager } from './helpers/undoManager';
import { deleteProperties } from './helpers/properties';
import { debugUsingHotswap, setupHotswap } from './helpers/hotswap';

export async function activate(context: vscode.ExtensionContext) {

	let startServerCommand = vscode.commands.registerCommand('vaadin.start', function () {
		startServer();
	});
	let newProjectCommand = vscode.commands.registerCommand('vaadin.newProject', function () {
		createNewProject();
	});
	let setupHotswapCommand = vscode.commands.registerCommand('vaadin.setupHotswap', function () {
		setupHotswap(context);
	});
	let debugUsingHotswapCommand = vscode.commands.registerCommand('vaadin.debugUsingHotswap', function () {
		debugUsingHotswap(context);
	});

	// disposables
	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(startServerCommand);
	context.subscriptions.push(newProjectCommand);
	context.subscriptions.push(setupHotswapCommand);
	context.subscriptions.push(debugUsingHotswapCommand);

	if (isVaadinProject()) {
		startServer();
	}

	vscode.workspace.onDidSaveTextDocument(doc => undoManager.documentSaveListener(doc));
}

export function deactivate() {
	deleteProperties();
	statusBarItem.hide();
    console.log('Vaadin Copilot integration stopped');
}

async function createNewProject() {
	newProjectUserInput().then(model => {
		if (!model) {
			vscode.window.showWarningMessage(
				"Vaadin project generation cancelled"
			);
			return;
		}
		downloadAndExtract(model);
	});
}

function isVaadinProject(): boolean {
	const vaadinRegex = /com.vaadin/;

	// Maven projects
	if (projectPathExists('pom.xml')) {
		const contents = readProjectFile('pom.xml');
		return contents?.match(vaadinRegex) !== null;
	}

	// Gradle projects
	if (projectPathExists('build.gradle')) {
		const contents = readProjectFile('build.gradle');
		return contents?.match(vaadinRegex) !== null;
	}

	// Gradle Kotlin projects
	if (projectPathExists('build.gradle.kts')) {
		const contents = readProjectFile('build.gradle.kts');
		return contents?.match(vaadinRegex) !== null;
	}

	return false;
}
