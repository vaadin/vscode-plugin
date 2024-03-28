import express, { Express } from 'express';
import { Server, createServer } from "http";
import { deleteProperties, saveProperties } from './properties';
import { AddressInfo } from 'net';
import { writeFileHandler, showInIdeHandler, CommandRequest, Handlers } from './handlers';

var httpServer: Server;

export async function startServer() {

	const app: Express = express();
	httpServer = createServer(app);

	httpServer.listen(0, 'localhost', () => {
        const port = (httpServer.address() as AddressInfo).port;
        saveProperties(port);
    });

    httpServer.on('connection', socket => {
        socket.on('data', handleClientData);
    });

}

export function stopServer() {
    httpServer.close();
    deleteProperties();
}

function handleClientData(data: any) {
    const request = JSON.parse(data.toString()) as CommandRequest
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