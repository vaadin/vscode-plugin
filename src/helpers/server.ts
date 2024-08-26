import * as vscode from 'vscode';

import express from 'express';
import { Express } from 'express';
import { deleteProperties, saveProperties } from './properties';
import { AddressInfo } from 'net';
import { writeFileHandler, showInIdeHandler, undoRedoHandler, CommandRequest, Handlers, refresh } from './handlers';
import { Server } from 'http';
import { randomUUID } from 'crypto';

const app: Express = express()
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 50000}));


const postPath = '/endpoint-' + randomUUID();

export const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
statusBarItem.text = `$(server-running)`;
statusBarItem.tooltip = 'Vaadin Copilot integration is running';

export async function startServer() {
    app.post(postPath, (req, res) => {
        if (handleClientData(req.body)) {
            res.sendStatus(200);
        } else {
            res.sendStatus(400);
        }
    })

    const server = app.listen(0, 'localhost');
    server.on('listening', () => {
        statusBarItem.show();
        postStartup(server);
    });

    server.on('close', postShutdown);
}

function handleClientData(request: CommandRequest): boolean {
    switch (request.command) {
        case Handlers.WRITE:
            writeFileHandler(request.data);
            return true;
        case Handlers.UNDO:
            undoRedoHandler(request.data, 'undo');
            return true;
        case Handlers.REDO:
            undoRedoHandler(request.data, 'redo');
            return true;
        case Handlers.SHOW_IN_IDE:
            showInIdeHandler(request.data);
            return true;
        case Handlers.REFRESH:
            refresh();
            return true;
    }
    return false;
}

function postStartup(httpServer: Server) {
    saveProperties(`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}${postPath}`);
    console.log('Vaadin Copilot integration started');
}

function postShutdown() {
    deleteProperties();
    console.log('Vaadin Copilot integration stopped');
}
