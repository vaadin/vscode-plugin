import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { installHotswapJar } from '../helpers/hotswap';

suite('Hotswap agent install', () => {
  let originalInformation: typeof vscode.window.showInformationMessage;
  let tempDir: string;

  setup(() => {
    originalInformation = vscode.window.showInformationMessage;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vaadin-hotswap-test-'));
  });

  teardown(() => {
    vscode.window.showInformationMessage = originalInformation;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTestEnvironment(bundledContent: string, existingContent: string) {
    const extensionPath = path.join(tempDir, 'extension');
    const resourcesDir = path.join(extensionPath, 'resources');
    fs.mkdirSync(resourcesDir, { recursive: true });
    const bundledJarPath = path.join(resourcesDir, 'hotswap-agent.jar');
    fs.writeFileSync(bundledJarPath, bundledContent);

    const javaHome = path.join(tempDir, 'java-home');
    const hotswapDir = path.join(javaHome, 'lib', 'hotswap');
    fs.mkdirSync(hotswapDir, { recursive: true });
    const existingJarPath = path.join(hotswapDir, 'hotswap-agent.jar');
    fs.writeFileSync(existingJarPath, existingContent);

    return { extensionPath, javaHome, existingJarPath };
  }

  test('notifies when existing jar differs from bundled one', async () => {
    const { extensionPath, javaHome, existingJarPath } = createTestEnvironment('bundled', 'existing');
    let infoMessage: string | undefined;

    vscode.window.showInformationMessage = async (message: string) => {
      infoMessage = message;
      return undefined as any;
    };

    const result = await installHotswapJar({ extensionPath } as vscode.ExtensionContext, javaHome);

    assert.strictEqual(result, true);
    assert.ok(infoMessage?.includes('differs'), 'Expected a notification when the jar differs');
    assert.strictEqual(fs.readFileSync(existingJarPath, 'utf-8'), 'bundled');
  });

  test('does not notify when bundled jar matches existing one', async () => {
    const { extensionPath, javaHome } = createTestEnvironment('same', 'same');
    let notified = false;

    vscode.window.showInformationMessage = async () => {
      notified = true;
      return undefined as any;
    };

    const result = await installHotswapJar({ extensionPath } as vscode.ExtensionContext, javaHome);

    assert.strictEqual(result, true);
    assert.strictEqual(notified, false);
  });
});
