import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { newProjectUserInput, ProjectModel } from '../helpers/userInput';

// Import fs using require to allow mocking
const fs = require('fs');

// Helper types for test configuration based on ProjectModel
interface MockInputs extends Partial<ProjectModel> {
  projectName: string; // Maps to name in ProjectModel
  frameworks?: ('flow' | 'hilla')[]; // Maps to type in ProjectModel
  buildTool?: 'maven' | 'gradle'; // Maps to tool in ProjectModel
  folderExists?: boolean;
  warningResponse?: 'Yes' | 'Cancel'; // User's response to folder conflict warning
}

// Helper function to setup mocks based on configuration
function setupMocks(config: MockInputs): void {
  let inputBoxCalls = 0, quickPickCalls = 0;
  vscode.window.showInputBox = async () => {
    inputBoxCalls++;
    return inputBoxCalls === 1 ? config.projectName : config.groupId;
  };
  vscode.window.showQuickPick = async (items: any, options?: any) => {
    quickPickCalls++;
    if (quickPickCalls === 1) {
      return items.find((i: any) => i.value === config.workflow);
    }
    if (config.workflow === 'starter') {
      if (quickPickCalls === 2 && options?.canPickMany) {
        return (config.frameworks || config.type)?.map(fw => ({id: fw, label: fw})) || [];
      }
      if (quickPickCalls === 3) {
        return items.find((i: any) => i.value === (config.vaadinVersion || 'stable'));
      }
    } else if (config.workflow === 'helloworld') {
      if (quickPickCalls === 2) {
        const framework = (config.frameworks || config.type)?.[0] || 'flow';
        return items.find((i: any) => i.value === framework);
      }
      if (quickPickCalls === 3) {
        // For hilla framework, this is the build tool selection
        if ((config.frameworks || config.type)?.[0] === 'hilla') {
          return items.find((i: any) => i.value === (config.buildTool || config.tool || 'maven'));
        }
        // For flow framework, this is the language selection
        return items.find((i: any) => i.value === (config.language || 'java'));
      }
      if (quickPickCalls === 4) {
        // Only for flow + java, this is the build tool selection
        return items.find((i: any) => i.value === (config.buildTool || config.tool || 'maven'));
      }
    }
  };

  vscode.window.showOpenDialog = async () => [vscode.Uri.file(config.location || '/tmp')];
  
  vscode.window.showWarningMessage = async (message: string) => {
    if (config.folderExists) {
      assert.ok(message.includes("already exists"), "Warning should mention folder already exists");
      if (config.warningResponse === 'Yes') {
        assert.ok(message.includes("-1"), "Warning should suggest incremented name");
      }
    }
    return config.warningResponse === 'Yes' ? 'Yes' : undefined;
  };

  if (config.folderExists) {
    fs.existsSync = (path: string) => {
      if (path.includes(config.projectName) && !path.includes(`${config.projectName}-1`)) {
        return true;
      }
      return false;
    };
  }

}

// Helper function to assert model properties using ProjectModel
function assertModel(model: any, expected: Partial<ProjectModel>) {
  assert.ok(model, "Model should exist");
  assert.strictEqual(model?.workflow, expected.workflow);
  assert.strictEqual(model?.name, expected.name);
  assert.strictEqual(model?.groupId, expected.groupId);
  assert.strictEqual(path.resolve(model?.location || ''), path.resolve(expected.location || ''));

  if (expected.vaadinVersion) {
    assert.strictEqual(model?.vaadinVersion, expected.vaadinVersion);
  }
  if (expected.type) {
    assert.deepStrictEqual(model?.type, expected.type);
  }
  if (expected.language) {
    assert.strictEqual(model?.language, expected.language);
  }
  if (expected.tool) {
    assert.strictEqual(model?.tool, expected.tool);
  }
  if (expected.architecture) {
    assert.strictEqual(model?.architecture, expected.architecture);
  }
}

suite('User Input Test Suite', () => {
  let originalInputBox: any;
  let originalQuickPick: any;
  let originalOpenDialog: any;
  let originalWarning: any;
  let originalExistsSync: any;

  setup(() => {
    originalInputBox = vscode.window.showInputBox;
    originalQuickPick = vscode.window.showQuickPick;
    originalOpenDialog = vscode.window.showOpenDialog;
    originalWarning = vscode.window.showWarningMessage;
    originalExistsSync = fs.existsSync;
  });

  teardown(() => {
    vscode.window.showInputBox = originalInputBox;
    vscode.window.showQuickPick = originalQuickPick;
    vscode.window.showOpenDialog = originalOpenDialog;
    vscode.window.showWarningMessage = originalWarning;
    fs.existsSync = originalExistsSync;
  });

  test('should return correct model for starter workflow (flow)', async () => {
    setupMocks({
      projectName: 'MyProject',
      groupId: 'com.example',
      workflow: 'starter',
      type: ['flow'],
      vaadinVersion: 'stable',
      location: '/tmp'
    });

    const model = await newProjectUserInput();
    assertModel(model, {
      workflow: 'starter',
      name: 'MyProject',
      groupId: 'com.example',
      vaadinVersion: 'stable',
      type: ['flow'],
      location: '/tmp'
    });
  });

  test('should return correct model for starter workflow (flow+hilla)', async () => {
    setupMocks({
      projectName: 'MyProjectFH',
      groupId: 'com.example.fh',
      workflow: 'starter',
      type: ['flow', 'hilla'],
      vaadinVersion: 'stable',
      location: '/tmp-fh'
    });

    const model = await newProjectUserInput();
    assertModel(model, {
      workflow: 'starter',
      name: 'MyProjectFH',
      groupId: 'com.example.fh',
      vaadinVersion: 'stable',
      type: ['flow', 'hilla'],
      location: '/tmp-fh'
    });
  });

  test('should return correct model for starter workflow (none)', async () => {
    setupMocks({
      projectName: 'MyProjectNone',
      groupId: 'com.example.none',
      workflow: 'starter',
      type: [],
      vaadinVersion: 'stable',
      location: '/tmp-none'
    });

    const model = await newProjectUserInput();
    assertModel(model, {
      workflow: 'starter',
      name: 'MyProjectNone',
      groupId: 'com.example.none',
      vaadinVersion: 'stable',
      type: [],
      location: '/tmp-none'
    });
  });

  test('should return correct model for helloworld workflow (Hilla)', async () => {
    setupMocks({
      projectName: 'HelloWorldHilla',
      groupId: 'org.hilla',
      workflow: 'helloworld',
      type: ['hilla'],
      language: 'java',
      tool: 'maven',
      location: '/tmp-hilla'
    });

    const model = await newProjectUserInput();
    assertModel(model, {
      workflow: 'helloworld',
      name: 'HelloWorldHilla',
      groupId: 'org.hilla',
      type: ['hilla'],
      language: 'java',
      tool: 'maven',
      architecture: 'springboot',
      location: '/tmp-hilla'
    });
  });

  test('should return correct model for helloworld workflow (Flow + Kotlin)', async () => {
    setupMocks({
      projectName: 'HelloWorldKotlin',
      groupId: 'org.flowk',
      workflow: 'helloworld',
      type: ['flow'],
      language: 'kotlin',
      tool: 'maven',
      location: '/tmp-flowk'
    });

    const model = await newProjectUserInput();
    assertModel(model, {
      workflow: 'helloworld',
      name: 'HelloWorldKotlin',
      groupId: 'org.flowk',
      type: ['flow'],
      language: 'kotlin',
      tool: 'maven',
      architecture: 'springboot',
      location: '/tmp-flowk'
    });
  });

  test('should return correct model for helloworld workflow (Flow + Java + Gradle)', async () => {
    setupMocks({
      projectName: 'HelloWorldGradle',
      groupId: 'org.flowg',
      workflow: 'helloworld',
      type: ['flow'],
      language: 'java',
      tool: 'gradle',
      location: '/tmp-flowg'
    });

    const model = await newProjectUserInput();
    assertModel(model, {
      workflow: 'helloworld',
      name: 'HelloWorldGradle',
      groupId: 'org.flowg',
      type: ['flow'],
      language: 'java',
      tool: 'gradle',
      architecture: 'springboot',
      location: '/tmp-flowg'
    });
  });

  test('should handle folder conflict when user accepts new name (starter workflow)', async () => {
    setupMocks({
      projectName: 'MyProject',
      groupId: 'com.example',
      workflow: 'starter',
      type: ['flow'],
      vaadinVersion: 'stable',
      location: '/tmp',
      folderExists: true,
      warningResponse: 'Yes'
    });

    const model = await newProjectUserInput();

    assertModel(model, {
      workflow: 'starter',
      name: 'MyProject-1', // Should be incremented
      groupId: 'com.example',
      vaadinVersion: 'stable',
      type: ['flow'],
      location: '/tmp'
    });
  });

  test('should return undefined when user cancels folder conflict dialog', async () => {
    setupMocks({
      projectName: 'MyProject',
      groupId: 'com.example',
      workflow: 'starter',
      type: ['flow'],
      vaadinVersion: 'stable',
      location: '/tmp',
      folderExists: true,
      warningResponse: 'Cancel'
    });

    const model = await newProjectUserInput();

    assert.strictEqual(model, undefined, "Should return undefined when user cancels");
  });

  test('should handle folder conflict for helloworld workflow when user accepts', async () => {
    setupMocks({
      projectName: 'HelloWorldTest',
      groupId: 'org.test',
      workflow: 'helloworld',
      type: ['hilla'],
      language: 'java',
      tool: 'maven',
      location: '/tmp-test',
      folderExists: true,
      warningResponse: 'Yes'
    });

    const model = await newProjectUserInput();

    assertModel(model, {
      workflow: 'helloworld',
      name: 'HelloWorldTest-1', // Should be incremented
      groupId: 'org.test',
      type: ['hilla'],
      language: 'java',
      tool: 'maven',
      architecture: 'springboot',
      location: '/tmp-test'
    });
  });
});
