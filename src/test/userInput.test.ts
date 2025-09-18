import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { newProjectUserInput } from '../helpers/userInput';

suite('User Input Test Suite', () => {
  let originalInputBox: any;
  let originalQuickPick: any;
  let originalOpenDialog: any;
  let originalWarning: any;

  setup(() => {
    originalInputBox = vscode.window.showInputBox;
    originalQuickPick = vscode.window.showQuickPick;
    originalOpenDialog = vscode.window.showOpenDialog;
    originalWarning = vscode.window.showWarningMessage;
  });

  teardown(() => {
    vscode.window.showInputBox = originalInputBox;
    vscode.window.showQuickPick = originalQuickPick;
    vscode.window.showOpenDialog = originalOpenDialog;
    vscode.window.showWarningMessage = originalWarning;
  });

  test('should return correct model for starter workflow', async () => {
    let inputBoxCalls = 0;
    vscode.window.showInputBox = async () => {
      inputBoxCalls++;
      return inputBoxCalls === 1 ? 'MyProject' : 'com.example';
    };
    let quickPickCalls = 0;
    vscode.window.showQuickPick = async (items: any) => {
      quickPickCalls++;
      if (quickPickCalls === 1) { return items.find((i: any) => i.value === 'starter'); }
      if (quickPickCalls === 2) { return items.find((i: any) => i.value === 'stable'); }
      if (quickPickCalls === 3) { return items.find((i: any) => i.value === true); }
      if (quickPickCalls === 4) { return items.find((i: any) => i.value === 'flow'); }
      return undefined;
    };
    vscode.window.showOpenDialog = async () => [vscode.Uri.file('/tmp')];
    vscode.window.showWarningMessage = async () => 'Yes';

    const model = await newProjectUserInput();
    assert.ok(!false);
    assert.ok(model);
    assert.strictEqual(model?.workflow, 'starter');
    assert.strictEqual(model?.name, 'MyProject');
    assert.strictEqual(model?.groupId, 'com.example');
    assert.strictEqual(model?.vaadinVersion, 'stable');
    assert.strictEqual(model?.walkingSkeleton, true);
    assert.strictEqual(model?.starterType, 'flow');
    assert.strictEqual(path.resolve(model?.location || ''), path.resolve('/tmp'));
  });

  test('should return correct model for helloworld workflow (Hilla)', async () => {
    let inputBoxCalls = 0;
    vscode.window.showInputBox = async () => {
      inputBoxCalls++;
      return inputBoxCalls === 1 ? 'HelloWorldHilla' : 'org.hilla';
    };
    let quickPickCalls = 0;
    vscode.window.showQuickPick = async (items: any) => {
      quickPickCalls++;
      if (quickPickCalls === 1) { return items.find((i: any) => i.value === 'helloworld'); }
      if (quickPickCalls === 2) { return items.find((i: any) => i.value === 'hilla'); }
      if (quickPickCalls === 3) { return items.find((i: any) => i.value === 'maven'); }
      return undefined;
    };
    vscode.window.showOpenDialog = async () => [vscode.Uri.file('/tmp-hilla')];
    vscode.window.showWarningMessage = async () => 'Yes';

    const model = await newProjectUserInput();
    assert.ok(model);
    assert.strictEqual(model?.workflow, 'helloworld');
    assert.strictEqual(model?.name, 'HelloWorldHilla');
    assert.strictEqual(model?.groupId, 'org.hilla');
    assert.strictEqual(model?.framework, 'hilla');
    assert.strictEqual(model?.language, 'java');
    assert.strictEqual(model?.buildTool, 'maven');
    assert.strictEqual(model?.architecture, 'springboot');
    assert.strictEqual(path.resolve(model?.location || ''), path.resolve('/tmp-hilla'));
  });

  test('should return correct model for helloworld workflow (Flow + Kotlin)', async () => {
    let inputBoxCalls = 0;
    vscode.window.showInputBox = async () => {
      inputBoxCalls++;
      return inputBoxCalls === 1 ? 'HelloWorldKotlin' : 'org.flowk';
    };
    let quickPickCalls = 0;
    vscode.window.showQuickPick = async (items: any) => {
      quickPickCalls++;
      if (quickPickCalls === 1) { return items.find((i: any) => i.value === 'helloworld'); }
      if (quickPickCalls === 2) { return items.find((i: any) => i.value === 'flow'); }
      if (quickPickCalls === 3) { return items.find((i: any) => i.value === 'kotlin'); }
      return undefined;
    };
    vscode.window.showOpenDialog = async () => [vscode.Uri.file('/tmp-flowk')];
    vscode.window.showWarningMessage = async () => 'Yes';

    const model = await newProjectUserInput();
    assert.ok(model);
    assert.strictEqual(model?.workflow, 'helloworld');
    assert.strictEqual(model?.name, 'HelloWorldKotlin');
    assert.strictEqual(model?.groupId, 'org.flowk');
    assert.strictEqual(model?.framework, 'flow');
    assert.strictEqual(model?.language, 'kotlin');
    assert.strictEqual(model?.buildTool, 'maven');
    assert.strictEqual(model?.architecture, 'springboot');
    assert.strictEqual(path.resolve(model?.location || ''), path.resolve('/tmp-flowk'));
  });

  test('should return correct model for helloworld workflow (Flow + Java + Gradle)', async () => {
    let inputBoxCalls = 0;
    vscode.window.showInputBox = async () => {
      inputBoxCalls++;
      return inputBoxCalls === 1 ? 'HelloWorldGradle' : 'org.flowg';
    };
    let quickPickCalls = 0;
    vscode.window.showQuickPick = async (items: any) => {
      quickPickCalls++;
      if (quickPickCalls === 1) { return items.find((i: any) => i.value === 'helloworld'); }
      if (quickPickCalls === 2) { return items.find((i: any) => i.value === 'flow'); }
      if (quickPickCalls === 3) { return items.find((i: any) => i.value === 'java'); }
      if (quickPickCalls === 4) { return items.find((i: any) => i.value === 'gradle'); }
      return undefined;
    };
    vscode.window.showOpenDialog = async () => [vscode.Uri.file('/tmp-flowg')];
    vscode.window.showWarningMessage = async () => 'Yes';

    const model = await newProjectUserInput();
    assert.ok(model);
    assert.strictEqual(model?.workflow, 'helloworld');
    assert.strictEqual(model?.name, 'HelloWorldGradle');
    assert.strictEqual(model?.groupId, 'org.flowg');
    assert.strictEqual(model?.framework, 'flow');
    assert.strictEqual(model?.language, 'java');
    assert.strictEqual(model?.buildTool, 'gradle');
    assert.strictEqual(model?.architecture, 'springboot');
    assert.strictEqual(path.resolve(model?.location || ''), path.resolve('/tmp-flowg'));
  });
});
