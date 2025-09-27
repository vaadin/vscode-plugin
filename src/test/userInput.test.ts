import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { newProjectUserInput } from '../helpers/userInput';

// Import fs using require to allow mocking
const fs = require('fs');

// Helper types for test configuration
interface MockInputs {
  projectName: string;
  groupId: string;
  workflow: 'starter' | 'helloworld';
  frameworks?: ('flow' | 'hilla')[];
  vaadinVersion?: 'stable' | 'pre';
  language?: 'java' | 'kotlin';
  buildTool?: 'maven' | 'gradle';
  location: string;
  folderExists?: boolean;
  userAcceptsFolderConflict?: boolean;
}

interface ExpectedModel {
  workflow: 'starter' | 'helloworld';
  name: string;
  groupId: string;
  vaadinVersion?: 'stable' | 'pre';
  type?: ('flow' | 'hilla')[];
  language?: 'java' | 'kotlin';
  tool?: 'maven' | 'gradle';
  architecture?: 'springboot' | 'quarkus' | 'jakartaee' | 'servlet';
  location: string;
}

// Helper function to setup mocks based on configuration
function setupMocks(config: MockInputs): { warningCalled: () => boolean } {
  let warningMessageCalled = false;

  let inputBoxCalls = 0;
  vscode.window.showInputBox = async () => {
    inputBoxCalls++;
    return inputBoxCalls === 1 ? config.projectName : config.groupId;
  };

  let quickPickCalls = 0;
  vscode.window.showQuickPick = async (items: any, options?: any) => {
    quickPickCalls++;

    if (quickPickCalls === 1) {
      return items.find((i: any) => i.value === config.workflow);
    }

    if (config.workflow === 'starter') {
      if (quickPickCalls === 2 && options?.canPickMany) {
        return config.frameworks?.map(fw => ({
          id: fw,
          label: fw === 'flow' ? 'Java UI with Vaadin Flow' : 'React UI with Vaadin Hilla'
        })) || [];
      }
      if (quickPickCalls === 3) {
        return items.find((i: any) => i.value === (config.vaadinVersion || 'stable'));
      }
    } else if (config.workflow === 'helloworld') {
      if (quickPickCalls === 2) {
        const framework = config.frameworks?.[0] || 'flow';
        return items.find((i: any) => i.value === framework);
      }
      if (quickPickCalls === 3) {
        // For hilla framework, this is the build tool selection
        if (config.frameworks?.[0] === 'hilla') {
          return items.find((i: any) => i.value === (config.buildTool || 'maven'));
        }
        // For flow framework, this is the language selection
        return items.find((i: any) => i.value === (config.language || 'java'));
      }
      if (quickPickCalls === 4) {
        // Only for flow + java, this is the build tool selection
        return items.find((i: any) => i.value === (config.buildTool || 'maven'));
      }
    }

    return undefined;
  };

  vscode.window.showOpenDialog = async () => [vscode.Uri.file(config.location)];

  vscode.window.showWarningMessage = async (message: string) => {
    warningMessageCalled = true;
    if (config.folderExists) {
      assert.ok(message.includes("already exists"), "Warning should mention folder already exists");
      if (config.userAcceptsFolderConflict !== false) {
        assert.ok(message.includes("-1"), "Warning should suggest incremented name");
      }
    }
    return config.userAcceptsFolderConflict !== false ? 'Yes' : undefined;
  };

  if (config.folderExists) {
    fs.existsSync = (path: string) => {
      if (path.includes(config.projectName) && !path.includes(`${config.projectName}-1`)) {
        return true;
      }
      return false;
    };
  }

  return { warningCalled: () => warningMessageCalled };
}

// Helper function to assert model properties
function assertModel(model: any, expected: ExpectedModel, warningCalled?: boolean) {
  assert.ok(model, "Model should exist");
  assert.strictEqual(model?.workflow, expected.workflow);
  assert.strictEqual(model?.name, expected.name);
  assert.strictEqual(model?.groupId, expected.groupId);
  assert.strictEqual(path.resolve(model?.location || ''), path.resolve(expected.location));

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
  if (warningCalled !== undefined) {
    assert.strictEqual(warningCalled, true, "Warning message should have been shown");
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
      frameworks: ['flow'],
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
      frameworks: ['flow', 'hilla'],
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
      frameworks: [],
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
      frameworks: ['hilla'],
      language: 'java',
      buildTool: 'maven',
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
      frameworks: ['flow'],
      language: 'kotlin',
      buildTool: 'maven',
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
      frameworks: ['flow'],
      language: 'java',
      buildTool: 'gradle',
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
    const mockResult = setupMocks({
      projectName: 'MyProject',
      groupId: 'com.example',
      workflow: 'starter',
      frameworks: ['flow'],
      vaadinVersion: 'stable',
      location: '/tmp',
      folderExists: true,
      userAcceptsFolderConflict: true
    });

    const model = await newProjectUserInput();

    assertModel(model, {
      workflow: 'starter',
      name: 'MyProject-1', // Should be incremented
      groupId: 'com.example',
      vaadinVersion: 'stable',
      type: ['flow'],
      location: '/tmp'
    }, mockResult.warningCalled());
  });

  test('should return undefined when user cancels folder conflict dialog', async () => {
    const mockResult = setupMocks({
      projectName: 'MyProject',
      groupId: 'com.example',
      workflow: 'starter',
      frameworks: ['flow'],
      vaadinVersion: 'stable',
      location: '/tmp',
      folderExists: true,
      userAcceptsFolderConflict: false
    });

    const model = await newProjectUserInput();

    assert.strictEqual(model, undefined, "Should return undefined when user cancels");
    assert.ok(mockResult.warningCalled(), "Warning message should have been shown");
  });

  test('should handle folder conflict for helloworld workflow when user accepts', async () => {
    const mockResult = setupMocks({
      projectName: 'HelloWorldTest',
      groupId: 'org.test',
      workflow: 'helloworld',
      frameworks: ['hilla'],
      language: 'java',
      buildTool: 'maven',
      location: '/tmp-test',
      folderExists: true,
      userAcceptsFolderConflict: true
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
    }, mockResult.warningCalled());
  });
});
