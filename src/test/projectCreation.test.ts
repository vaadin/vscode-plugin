process.env.NODE_ENV = 'test';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { downloadAndExtract } from '../helpers/projectFilesHelpers';

const TEST_GROUP_ID = 'com.vaadintest.uniquenamespace';
const TEST_ARTIFACT_ID = 'vaadin-starter-unique-test-project';

function hasFiles(
  folder: string, filter: (fileName: string) => boolean
): boolean {
  return fs.existsSync(folder) &&
    fs.readdirSync(folder, { withFileTypes: true }).some(item => {
      if (item.isDirectory()) {
        return hasFiles(path.join(folder, item.name), filter);
      }
      return filter(item.name);
    });
}

function hasFlowViews(folder: string, groupId: string): boolean {
  const javaDir = path.join(folder, 'src', 'main', 'java', ...groupId.split('.'));
  return hasFiles(javaDir, (name) => name.endsWith('View.java'));
}

function hasHillaViews(folder: string): boolean {
  const viewsDir = path.join(folder, 'src', 'main', 'frontend', 'views');
  return hasFiles(viewsDir, (name) => name.endsWith('.tsx'));
}

suite('Vaadin Project Creation Test Suite', function() {
  // default is 2000 but download and extraction can take longer
  this.timeout(10000);

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

  test('Should create a Starter Project with the expected folder name and artifactId and Flow views', async function() {
    const model = {
      workflow: 'starter' as const,
      name: TEST_ARTIFACT_ID + 'Starter',
      artifactId: TEST_ARTIFACT_ID + '-starter',
      groupId: TEST_GROUP_ID,
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);
    const expectedPath = path.join(testLocation, TEST_ARTIFACT_ID + 'Starter');
    // Give a small delay to ensure file system operations are complete
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that Flow views exist (since we specified 'flow' framework)
    assert.ok(hasFlowViews(expectedPath, TEST_GROUP_ID),
      'Flow views (Java files ending in View.java) should exist for Flow framework selection');

    // Check that pom.xml exists and contains the correct artifactId
    const pomPath = path.join(expectedPath, 'pom.xml');
    assert.ok(fs.existsSync(pomPath), 'pom.xml should exist');

    const pomContent = fs.readFileSync(pomPath, 'utf-8');
    assert.ok(pomContent.includes(`<artifactId>${TEST_ARTIFACT_ID + '-starter'}</artifactId>`), 'pom.xml should contain the correct artifactId');
  });

  test('Should create a Starter Project with Flow and Hilla and include React components', async function() {
    const model = {
      workflow: 'starter' as const,
      name: TEST_ARTIFACT_ID,
      artifactId: TEST_ARTIFACT_ID,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: ['flow', 'hilla'] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);

    const expectedPath = path.join(testLocation, TEST_ARTIFACT_ID);
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that Flow views exist (since we specified 'flow' framework)
    assert.ok(hasFlowViews(expectedPath, TEST_GROUP_ID),
      'Flow views (Java files ending in View.java) should exist for Flow framework selection');

    // Check that Hilla views exist (since we specified 'hilla' framework)
    assert.ok(hasHillaViews(expectedPath),
      'Hilla views (files in src/main/frontend/views) should exist for Hilla framework selection');
  });

  test('Should create a Starter Project with no frameworks and exclude both Java and React views', async function() {
    const model = {
      workflow: 'starter' as const,
      name: TEST_ARTIFACT_ID,
      artifactId: TEST_ARTIFACT_ID,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      vaadinVersion: 'stable' as const,
      walkingSkeleton: true,
      type: [] as ('flow' | 'hilla')[],
    };
    await downloadAndExtract(model);

    const expectedPath = path.join(testLocation, TEST_ARTIFACT_ID);
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');

    // Check that pom.xml exists and contains the correct artifactId
    const pomPath = path.join(expectedPath, 'pom.xml');
    assert.ok(fs.existsSync(pomPath), 'pom.xml should exist');

    const pomContent = fs.readFileSync(pomPath, 'utf-8');
    assert.ok(pomContent.includes(`<artifactId>${TEST_ARTIFACT_ID}</artifactId>`), 'pom.xml should contain the correct artifactId');

    // Check that Flow views do NOT exist (no Flow framework selected)
    assert.ok(!hasFlowViews(expectedPath, TEST_GROUP_ID), 'Flow views should NOT exist when no frameworks are selected');

    // Check that Hilla views do NOT exist (no Hilla framework selected)
    assert.ok(!hasHillaViews(expectedPath), 'Hilla views should NOT exist when no frameworks are selected');
  });

  test('Should create a Hello World Project with the expected folder name', async function() {
    const model = {
      workflow: 'helloworld' as const,
      name: TEST_ARTIFACT_ID,
      artifactId: TEST_ARTIFACT_ID,
      groupId: TEST_GROUP_ID,
      location: testLocation,
      type: ['flow'] as ('flow' | 'hilla')[],
      language: 'java' as const,
      tool: 'maven' as const,
      architecture: 'springboot' as const,
    };
    await downloadAndExtract(model);

    const expectedPath = path.join(testLocation, TEST_ARTIFACT_ID);
    assert.ok(fs.existsSync(expectedPath), 'Project folder should exist');
  });

});
