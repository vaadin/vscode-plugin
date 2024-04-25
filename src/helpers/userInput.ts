import * as vscode from "vscode";

export type ProjectModel = {
    name: string;
    location: string;
    exampleViews: string;
    authentication: boolean;
    version: string;
}

// based on https://github.com/marcushellberg/luoja
export async function newProjectUserInput(): Promise<ProjectModel | undefined> {

    // Project name
    const name = await vscode.window.showInputBox({
        prompt: "Project Name",
    }) || "untitled";

    // Project location
    const locationUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Project location",
        openLabel: "Create here",
    });
    const location = locationUri ? locationUri[0].fsPath : undefined;
    if (!location) return;

    // Example views
    const exampleViews = await vscode.window.showQuickPick(["Flow (Java)", "Hilla (React)", "None"], {
        placeHolder: "Include example views?",
    });
    if (!exampleViews) return;

    // Authentication
    const authentication =
        (await vscode.window.showQuickPick(["Yes", "No"], {
            placeHolder: "Use authentication?",
        })) === "Yes";
    if (!authentication === undefined) return;

    // Version
    const version = await vscode.window.showQuickPick(["Stable", "Prerelease"], {
        placeHolder: "Select a Version",
    });
    if (!version) return;

    return {
        name,
        location,
        exampleViews,
        authentication,
        version
    }

}
