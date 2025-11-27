import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

type WalkthroughStep = {
  id: string;
  media?: {
    markdown?: string;
  };
  completionEvents?: string[];
};

type WalkthroughContribution = {
  id: string;
  steps?: WalkthroughStep[];
};

// Regression guard to ensure the walkthrough guidance stays wired to the core commands and assets.
suite('Walkthrough Contribution Suite', () => {
  const root = path.join(__dirname, '..', '..');
  const manifestPath = path.join(root, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    contributes?: { walkthroughs?: WalkthroughContribution[] };
  };
  const walkthrough = manifest.contributes?.walkthroughs?.find((entry) => entry.id === 'vaadin.walkthrough');
  const steps = walkthrough?.steps ?? [];

  test('walkthrough is contributed', () => {
    assert.ok(walkthrough, 'Vaadin walkthrough should be registered in package.json');
  });

  test('walkthrough steps point at bundled markdown', () => {
    const mediaPaths = new Set(steps.map((step) => step.media?.markdown).filter((item): item is string => Boolean(item)));
    const expectedPaths = [
      'resources/walkthrough/create-project.md',
      'resources/walkthrough/hotswap.md',
      'resources/walkthrough/copilot.md',
      'resources/walkthrough/learn-more.md',
    ];

    expectedPaths.forEach((resourcePath) => {
      assert.ok(mediaPaths.has(resourcePath), `${resourcePath} should be referenced by a walkthrough step`);
      assert.ok(fs.existsSync(path.join(root, resourcePath)), `${resourcePath} should exist on disk`);
    });
  });

  test('walkthrough completion events mirror core commands', () => {
    const completionEvents = steps.flatMap((step) => step.completionEvents || []);
    const expectedEvents = [
      'onCommand:vaadin.newProject',
      'onCommand:vaadin.setupHotswap',
      'onCommand:vaadin.debugUsingHotswap',
      'onCommand:vaadin.start',
    ];

    expectedEvents.forEach((event) => {
      assert.ok(completionEvents.includes(event), `Walkthrough should complete when ${event} fires`);
    });
  });
});
