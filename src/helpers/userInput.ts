import { toKebabCase } from "js-convert-case";
import * as vscode from "vscode";

export type ProjectModel = {
    name: string;
    artifactId: string;
    location: string;
    exampleViews: string;
    authentication: boolean;
    version: string;
};

// based on https://github.com/marcushellberg/luoja
export async function newProjectUserInput(): Promise<ProjectModel | undefined> {

    // Project name
    const name = await vscode.window.showInputBox({
        prompt: "Project Name",
        value: "New Project",
        validateInput: v => {
            if (!v.match(/^[^\.].*[^\.]$/)) {
                return "Project name must be valid directory name.";
            }
        }
    });
    if (!name) {
        return;
    }

    // Artifact Id
    const artifactId = await vscode.window.showInputBox({
        prompt: "Artifact Id, should be valid Java artifact identifier",
        value: toKebabCase(name),
        validateInput: v => {
            if (!v.match(/^[0-9a-z\-\_]+$/)) {
                return "Artifact Id should contain a-z, 0-9, -, _ characters only.";
            }
        }
    });
    if (!artifactId) {
        return;
    } 

    // Example views
    const exampleViews = await vscode.window.showQuickPick(["Flow (Java)", "Hilla (React)", "None"], {
        placeHolder: "Include example views?",
    });
    if (!exampleViews) {
        return;
    }

    // Authentication
    const authentication =
        (await vscode.window.showQuickPick(["Yes", "No"], {
            placeHolder: "Use authentication?",
        })) === "Yes";
    if (!authentication === undefined) {
        return;
    }

    // Version
    const version = await vscode.window.showQuickPick(["Stable", "Prerelease"], {
        placeHolder: "Select a Version",
    });
    if (!version) {
        return;
    }

    // Project location
    const locationUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Project location",
        openLabel: "Create here"
    });
    const location = locationUri ? locationUri[0].fsPath : undefined;
    if (!location) {
        return;
    }

    return {
        name: name.trim(),
        artifactId,
        location,
        exampleViews,
        authentication,
        version
    };

}
