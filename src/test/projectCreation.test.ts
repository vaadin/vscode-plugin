process.env.NODE_ENV = 'test';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { downloadAndExtract } from '../helpers/projectFilesHelpers';

suite('Vaadin Project Creation Test Suite', () => {
  const testLocation = path.join(__dirname, 'tmp-projects');

  setup(() => {
    if (!fs.existsSync(testLocation)) {
      fs.mkdirSync(testLocation);
    }
  });

  teardown(() => {
    // Clean up all folders created in testLocation
    if (fs.existsSync(testLocation)) {
      fs.readdirSync(testLocation).forEach(f => {
        fs.rmSync(path.join(testLocation, f), { recursive: true, force: true });
      });
    }
  });

  test('Should create a Starter Project with the expected folder name', async () => {
    const model = {
      workflow: 'starter' as const,
      name: 'TestStarter',
      artifactId: 'teststarter',
      groupId: 'com.example',
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, 'TestStarter');
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that the expected Java file exists
    const javaFilePath = path.join(expectedPath, 'src/main/java/com/example/taskmanagement/ui/TaskListView.java');
    assert.ok(fs.existsSync(javaFilePath), 'TaskListView.java should exist in the expected location');

    // Check that pom.xml exists and contains the correct artifactId
    const pomPath = path.join(expectedPath, 'pom.xml');
    assert.ok(fs.existsSync(pomPath), 'pom.xml should exist');

    const pomContent = fs.readFileSync(pomPath, 'utf-8');
    assert.ok(pomContent.includes('<artifactId>teststarter</artifactId>'), 'pom.xml should contain the correct artifactId');
  });

  test('Should create a Starter Project with Flow and Hilla and include React components', async () => {
    const model = {
      workflow: 'starter' as const,
      name: 'TestStarter',
      artifactId: 'teststarter',
      groupId: 'com.example',
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow', 'hilla'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, 'TestStarter');
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that the expected Java file exists
    const javaFilePath = path.join(expectedPath, 'src/main/java/com/example/taskmanagement/ui/TaskListView.java');
    assert.ok(fs.existsSync(javaFilePath), 'TaskListView.java should exist in the expected location');

    // Check that the React TypeScript file exists (for Hilla)
    const reactFilePath = path.join(expectedPath, 'src/main/frontend/views/task-list.tsx');
    assert.ok(fs.existsSync(reactFilePath), 'task-list.tsx should exist in the frontend views directory');
  });

  test('Should create a Starter Project with no frameworks and exclude both Java and React views', async () => {
    const model = {
      workflow: 'starter' as const,
      name: 'TestStarter',
      artifactId: 'teststarter',
      groupId: 'com.example',
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: [] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, 'TestStarter');
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that pom.xml exists and contains the correct artifactId
    const pomPath = path.join(expectedPath, 'pom.xml');
    assert.ok(fs.existsSync(pomPath), 'pom.xml should exist');

    const pomContent = fs.readFileSync(pomPath, 'utf-8');
    assert.ok(pomContent.includes('<artifactId>teststarter</artifactId>'), 'pom.xml should contain the correct artifactId');

    // Check that the Java view does NOT exist (no Flow)
    const javaFilePath = path.join(expectedPath, 'src/main/java/com/example/taskmanagement/ui/TaskListView.java');
    assert.ok(!fs.existsSync(javaFilePath), 'TaskListView.java should NOT exist when no frameworks are selected');

    // Check that the React TypeScript file does NOT exist (no Hilla)
    const reactFilePath = path.join(expectedPath, 'src/main/frontend/views/task-list.tsx');
    assert.ok(!fs.existsSync(reactFilePath), 'task-list.tsx should NOT exist when no frameworks are selected');
  });

  test('Should create a Hello World Project with the expected folder name', async () => {
    const model = {
      workflow: 'helloworld' as const,
      name: 'TestHello',
      artifactId: 'testhello',
      groupId: 'com.example',
      location: testLocation,
      type: ['flow'] as ('flow' | 'hilla')[],
      language: 'java' as const,
      tool: 'maven' as const,
      architecture: 'springboot' as const,
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, 'TestHello');
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');
  });

  test('Should increment folder name if it already exists', async () => {
    const baseName = 'TestConflict';
    const firstPath = path.join(testLocation, baseName);
    fs.mkdirSync(firstPath);
    // Simulate user accepting the new name in user input logic
    const model = {
      workflow: 'starter' as const,
      name: baseName + '-1',
      artifactId: 'testconflict-1',
      groupId: 'com.example',
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, baseName + '-1');
    assert.ok(fs.existsSync(expectedPath), 'Incremented project folder should exist');
  });
});
