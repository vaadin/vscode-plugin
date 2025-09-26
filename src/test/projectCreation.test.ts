process.env.NODE_ENV = 'test';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { downloadAndExtract } from '../helpers/projectFilesHelpers';

const TEST_GROUP_ID = 'com.vaadintest.uniquenamespace';
const TEST_ARTIFACT_ID_STARTER = 'vaadin-starter-unique-test-project';
const TEST_ARTIFACT_ID_HELLO = 'vaadin-hello-unique-test-project';
const TEST_ARTIFACT_ID_CONFLICT = 'vaadin-conflict-unique-test-project-1';
const TEST_PROJECT_NAME_STARTER = 'VaadinStarterUniqueTestProject';
const TEST_PROJECT_NAME_HELLO = 'VaadinHelloUniqueTestProject';
const TEST_PROJECT_NAME_CONFLICT = 'VaadinConflictUniqueTestProject';
const TEST_PROJECT_NAME_SKELETON_STARTER_SPRING = 'skeleton-starter-flow-spring-24';
const TEST_TIMEOUT_MS = 10000;

const findFilesRecursively = (
  startDir: string,
  fileCondition: (fileName: string) => boolean
): boolean => {
  try {
    if (!fs.existsSync(startDir)) {
      return false;
    }
    const items = fs.readdirSync(startDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(startDir, item.name);

      if (item.isDirectory()) {
        if (findFilesRecursively(fullPath, fileCondition)) {
          return true;
        }
      } else if (fileCondition(item.name)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

const hasFlowViews = (projectPath: string, groupId: string): boolean => {
  const groupPath = groupId.replace(/\./g, path.sep); // com.vaadintest.uniquenamespace -> com/vaadintest/uniquenamespace
  const javaDir = path.join(projectPath, 'src', 'main', 'java', groupPath);
  return findFilesRecursively(javaDir, (fileName) => fileName.endsWith('View.java'));
};

const hasHillaViews = (projectPath: string): boolean => {
  const viewsDir = path.join(projectPath, 'src', 'main', 'frontend', 'views');
  return findFilesRecursively(viewsDir, () => true); // Any file
};



suite('Vaadin Project Creation Test Suite', function() {
  const testLocation = path.join(__dirname, 'tmp-projects');

  // Set timeout for all tests in this suite
  this.timeout(TEST_TIMEOUT_MS);

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

  test('Should create a Starter Project with the expected folder name', async function() {
    const model = {
      workflow: 'starter' as const,
      name: TEST_PROJECT_NAME_STARTER,
      artifactId: TEST_ARTIFACT_ID_STARTER,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, TEST_PROJECT_NAME_STARTER);
    // Give a small delay to ensure file system operations are complete
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that Flow views exist (since we specified 'flow' framework)
    assert.ok(hasFlowViews(expectedPath, TEST_GROUP_ID), 'Flow views (Java files ending in View.java) should exist for Flow framework selection');

    // Check that pom.xml exists and contains the correct artifactId
    const pomPath = path.join(expectedPath, 'pom.xml');
    assert.ok(fs.existsSync(pomPath), 'pom.xml should exist');

    const pomContent = fs.readFileSync(pomPath, 'utf-8');
    assert.ok(pomContent.includes(`<artifactId>${TEST_ARTIFACT_ID_STARTER}</artifactId>`), 'pom.xml should contain the correct artifactId');
  });

  test('Should create a Starter Project with Flow and Hilla and include React components', async function() {
    const model = {
      workflow: 'starter' as const,
      name: TEST_PROJECT_NAME_STARTER,
      artifactId: TEST_ARTIFACT_ID_STARTER,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow', 'hilla'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);

    const expectedPath = path.join(testLocation, TEST_PROJECT_NAME_STARTER);
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that Flow views exist (since we specified 'flow' framework)
    assert.ok(hasFlowViews(expectedPath, TEST_GROUP_ID), 'Flow views (Java files ending in View.java) should exist for Flow framework selection');

    // Check that Hilla views exist (since we specified 'hilla' framework)
    assert.ok(hasHillaViews(expectedPath), 'Hilla views (files in src/main/frontend/views) should exist for Hilla framework selection');
  });

  test('Should create a Starter Project with no frameworks and exclude both Java and React views', async function() {
    const model = {
      workflow: 'starter' as const,
      name: TEST_PROJECT_NAME_STARTER,
      artifactId: TEST_ARTIFACT_ID_STARTER,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: [] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);

    const expectedPath = path.join(testLocation, TEST_PROJECT_NAME_STARTER);
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that pom.xml exists and contains the correct artifactId
    const pomPath = path.join(expectedPath, 'pom.xml');
    assert.ok(fs.existsSync(pomPath), 'pom.xml should exist');

    const pomContent = fs.readFileSync(pomPath, 'utf-8');
    assert.ok(pomContent.includes(`<artifactId>${TEST_ARTIFACT_ID_STARTER}</artifactId>`), 'pom.xml should contain the correct artifactId');

    // Check that Flow views do NOT exist (no Flow framework selected)
    assert.ok(!hasFlowViews(expectedPath, TEST_GROUP_ID), 'Flow views should NOT exist when no frameworks are selected');

    // Check that Hilla views do NOT exist (no Hilla framework selected)
    assert.ok(!hasHillaViews(expectedPath), 'Hilla views should NOT exist when no frameworks are selected');
  });

  test('Should create a Hello World Project with the expected folder name', async function() {
    const model = {
      workflow: 'helloworld' as const,
      name: TEST_PROJECT_NAME_HELLO,
      artifactId: TEST_ARTIFACT_ID_HELLO,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      type: ['flow'] as ('flow' | 'hilla')[],
      language: 'java' as const,
      tool: 'maven' as const,
      architecture: 'springboot' as const,
    };
    await downloadAndExtract(model);

    const expectedPath = path.join(testLocation, TEST_PROJECT_NAME_HELLO);
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');
  });

  test('Should increment folder name if it already exists', async function() {
    const baseName = TEST_PROJECT_NAME_CONFLICT;
    const firstPath = path.join(testLocation, baseName);
    fs.mkdirSync(firstPath);
    // Simulate user accepting the new name in user input logic
    const model = {
      workflow: 'starter' as const,
      name: baseName + '-1',
      artifactId: TEST_ARTIFACT_ID_CONFLICT,
      groupId: TEST_GROUP_ID,
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
