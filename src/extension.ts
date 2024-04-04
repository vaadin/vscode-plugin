import * as vscode from 'vscode';
import { projectPathExists, readProjectFile } from './helpers/projectFilesHelpers';
import { statusBarItem, startServer, stopServer } from './helpers/server';

export async function activate(context: vscode.ExtensionContext) {

	if (!isVaadinProject()) {
		return;
	}

	vscode.commands.executeCommand('setContext', 'vaadin.isRunning', false);

	let startServerCommand = vscode.commands.registerCommand('vaadin.start', function (uri) {
        startServer();
    });
	let stopServerCommand = vscode.commands.registerCommand('vaadin.stop', function (uri) {
        stopServer();
    });

	// disposables
	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(startServerCommand);
    context.subscriptions.push(stopServerCommand);

	startServer();
}

export function deactivate() {
	stopServer();
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
