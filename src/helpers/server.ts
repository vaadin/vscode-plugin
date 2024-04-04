import * as vscode from 'vscode';

import express, { Express } from 'express';
import { Server, createServer } from "http";
import { deleteProperties, saveProperties } from './properties';
import { AddressInfo } from 'net';
import { writeFileHandler, showInIdeHandler, CommandRequest, Handlers } from './handlers';

var httpServer: Server;

export let statusBarItem: vscode.StatusBarItem;
statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
updateStatusBarItem(false);
statusBarItem.show();

export async function startServer() {

	const app: Express = express();
	httpServer = createServer(app);

	httpServer.listen(0, 'localhost', postStartup);

    httpServer.on('connection', socket => {
        socket.on('data', handleClientData);
    });

}

export function stopServer() {
    httpServer.close(postShutdown);
}

function handleClientData(data: any) {
    const request = JSON.parse(data.toString()) as CommandRequest;
    switch(request.command) {
        case Handlers.WRITE:
            writeFileHandler(request.data);
            break;
        // case Handlers.UNDO:
        //     undoRedoHandler(request.data, 'undo');
        //     break;
        // case Handlers.REDO:
        //     undoRedoHandler(request.data, 'redo');
        //     break;
        case Handlers.SHOW_IN_IDE:
            showInIdeHandler(request.data);
            break;
    }
}

function postStartup() {
    const port = (httpServer.address() as AddressInfo).port;
    saveProperties(port);
    vscode.commands.executeCommand('setContext', 'vaadin.isRunning', true);
    vscode.window.showInformationMessage('Vaadin Copilot integration started');
    updateStatusBarItem(true);
}

function postShutdown() {
    deleteProperties();
    vscode.commands.executeCommand('setContext', 'vaadin.isRunning', false);
    vscode.window.showInformationMessage('Vaadin Copilot integration stopped');
    updateStatusBarItem(false);
}

function updateStatusBarItem(running: boolean) {
    if (running) {
        statusBarItem.text = `$(server-running)`;
        statusBarItem.tooltip = 'Vaadin Copilot integration is running, click to stop';
        statusBarItem.command = 'vaadin.stop';
    } else {
        statusBarItem.text = `$(server-stopped)`;
        statusBarItem.tooltip = 'Vaadin Copilot integration is not running, click to start';
        statusBarItem.command = 'vaadin.start';
    }
}