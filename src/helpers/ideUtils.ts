import * as vscode from 'vscode';
import { getProjectFilePath } from './projectFilesHelpers';

function escapePath(path: string): string {
    if (process.platform === 'win32') {
        // On Windows, escape backslashes and spaces
        return path.replace(/\\/g, '\\\\').replace(/ /g, '\\ ');
    } else {
        // On Unix-based systems, escape spaces with a backslash
        return path.replace(/ /g, '\\ ');
    }
}

const closeElectronTerminal = (n: number = 100) => setTimeout(() => {
    const electronTerminal = vscode.window.terminals.find(v => v.name.indexOf('bringToFront') !== -1);
    if (electronTerminal) {
        electronTerminal.sendText('ok');
    } else if (n > 0) {
        closeElectronTerminal(n - 1);
    }
}, 100);

// using exec() spawns child_process and it does not focus window, workaround as below works
export async function focusWindow() {
    let command: string;
    if (process.platform === 'win32') {
        command = `& '${process.execPath}' '${getProjectFilePath()}'`;
    } else {
        command = `${escapePath(process.env._!)} "${getProjectFilePath()!}"`;
    }
    console.log(command);
    const task = new vscode.Task(
        {   
            type: 'shell',
        },
        vscode.TaskScope.Workspace,
        'bringToFront',
        'vaadin',
        new vscode.ShellExecution(command)
    );
    vscode.tasks.executeTask(task).then(() => closeElectronTerminal(), 
    error => {
        console.error(error);
    });
}
