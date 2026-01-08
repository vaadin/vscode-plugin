import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getProjectFilePath } from './helpers/projectFilesHelpers';

/**
 * Provides "Go to Definition" support for @StyleSheet annotation file paths.
 *
 * Detects @StyleSheet("path/to/file.css") in Java files and makes the
 * file path Cmd/Ctrl-clickable to open the CSS file in the editor.
 *
 * Resolves paths relative to Java/Spring Boot public resource structure:
 * - src/main/webapp/
 * - src/main/resources/META-INF/resources/
 * - src/main/resources/static/
 * - src/main/resources/public/
 * - src/main/resources/resources/
 */
export class StyleSheetLinkProvider implements vscode.DefinitionProvider {
  // Matches @StyleSheet("path")
  private readonly STYLESHEET_REGEX = /@StyleSheet\s*\(\s*"([^"]+)"\s*\)/;

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Get the line text where the cursor is
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // Check if this line contains @StyleSheet annotation
    const match = lineText.match(this.STYLESHEET_REGEX);
    if (!match) {
      return undefined;
    }

    const filePath = match[1]; // Captured file path
    const resolvedPath = this.resolveStyleSheetPath(filePath);

    if (!resolvedPath) {
      return undefined;
    }

    // Find the exact position of the file path string within the quotes
    const quoteStart = lineText.indexOf('"', lineText.indexOf('@StyleSheet'));
    const filePathStart = quoteStart + 1; // Start after the opening quote
    const filePathEnd = filePathStart + filePath.length;

    // Check if the cursor is within the file path string
    if (position.character < filePathStart || position.character > filePathEnd) {
      return undefined;
    }

    // Return LocationLink with explicit origin range (the entire file path)
    // This ensures the whole string is highlighted/clickable, not just word boundaries
    const originRange = new vscode.Range(
      position.line,
      filePathStart,
      position.line,
      filePathEnd,
    );

    const locationLink: vscode.LocationLink = {
      targetUri: vscode.Uri.file(resolvedPath),
      targetRange: new vscode.Range(0, 0, 0, 0),
      originSelectionRange: originRange,
    };

    return [locationLink];
  }

  private resolveStyleSheetPath(filePath: string): string | undefined {
    const projectRoot = getProjectFilePath();
    if (!projectRoot) {
      return undefined;
    }

    // Normalize path (remove leading ./)
    const normalizedPath = filePath.replace(/^\.\//, '');

    // Try various Java/Spring Boot public resource locations
    const candidatePaths = [
      path.join(projectRoot, normalizedPath),
      path.join(projectRoot, 'src', 'main', 'webapp', normalizedPath),
      path.join(projectRoot, 'src', 'main', 'resources', 'META-INF', 'resources', normalizedPath),
      path.join(projectRoot, 'src', 'main', 'resources', 'static', normalizedPath),
      path.join(projectRoot, 'src', 'main', 'resources', 'public', normalizedPath),
      path.join(projectRoot, 'src', 'main', 'resources', 'resources', normalizedPath),
    ];

    return candidatePaths.find((p) => fs.existsSync(p));
  }
}
