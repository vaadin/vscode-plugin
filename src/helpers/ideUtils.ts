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
    const electronTerminal = vscode.window.terminals.find(v => v.name === 'Electron');
    if (electronTerminal) {
        electronTerminal.dispose();
    } else if (n > 0) {
        closeElectronTerminal(n--);
    }
}, 100);

// using exec() spawns child_process and it does not focus window, workaround as below works
export function focusWindow() {
    if (process.env._) {
        const task = new vscode.Task(
            {   
                type: 'shell',
            },
            vscode.TaskScope.Workspace,
            'bringToFront',
            'vaadin',
            new vscode.ShellExecution(`${escapePath(process.env._!)} "${getProjectFilePath()}"`)
        );
        vscode.tasks.executeTask(task);
        closeElectronTerminal();
    }
}
