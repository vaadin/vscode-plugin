import * as vscode from 'vscode';
import { projectPathExists, readProjectFile } from './helpers/projectFilesHelpers';
import { startServer, stopServer } from './helpers/server';

export async function activate(context: vscode.ExtensionContext) {

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('vaadin.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from vaadin!');
	// });

	if (!isVaadinProject()) {
		return;
	}

	startServer();

	vscode.window.showInformationMessage('Vaadin Copilot integration started');
	// context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
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
