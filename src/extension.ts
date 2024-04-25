import * as vscode from 'vscode';
import { downloadAndExtract, projectPathExists, readProjectFile } from './helpers/projectFilesHelpers';
import { statusBarItem, startServer, stopServer } from './helpers/server';
import { newProjectUserInput } from './helpers/userInput';

export async function activate(context: vscode.ExtensionContext) {

	if (!isVaadinProject()) {
		return;
	}

	vscode.commands.executeCommand('setContext', 'vaadin.isRunning', false);

	let startServerCommand = vscode.commands.registerCommand('vaadin.start', function () {
		startServer();
	});
	let stopServerCommand = vscode.commands.registerCommand('vaadin.stop', function () {
		stopServer();
	});
	let newProjectCommand = vscode.commands.registerCommand('vaadin.newProject', function () {
		createNewProject();
	});

	// disposables
	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(startServerCommand);
	context.subscriptions.push(stopServerCommand);
	context.subscriptions.push(newProjectCommand);

	startServer();
}

export function deactivate() {
	stopServer();
}

async function createNewProject() {
	newProjectUserInput().then(model => {
		if (!model) {
			vscode.window.showWarningMessage(
				"Vaadin Project creation cancelled"
			);
			return;
		}
		downloadAndExtract(model);
	})
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
