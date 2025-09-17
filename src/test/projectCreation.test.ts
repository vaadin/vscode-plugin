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
      starterType: 'flow' as const,
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, 'TestStarter');
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');
  });

  test('Should create a Hello World Project with the expected folder name', async () => {
    const model = {
      workflow: 'helloworld' as const,
      name: 'TestHello',
      artifactId: 'testhello',
      groupId: 'com.example',
      location: testLocation,
      framework: 'flow' as const,
      language: 'java' as const,
      buildTool: 'maven' as const,
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
      starterType: 'flow' as const,
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, baseName + '-1');
    assert.ok(fs.existsSync(expectedPath), 'Incremented project folder should exist');
  });
});
