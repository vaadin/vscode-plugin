import * as assert from 'assert';
import { compareHotswapAgentVersions } from '../helpers/hotswap';

suite('Hotswap agent version helpers', () => {
  test('compares numeric versions', () => {
    assert.strictEqual(compareHotswapAgentVersions('1.4.3', '1.4.2'), 1);
    assert.strictEqual(compareHotswapAgentVersions('1.4.2', '1.4.3'), -1);
    assert.strictEqual(compareHotswapAgentVersions('1.4.2', '1.4.2'), 0);
  });

  test('prefers release over snapshot for equal numeric versions', () => {
    assert.strictEqual(compareHotswapAgentVersions('1.4.2', '1.4.2-SNAPSHOT'), 1);
    assert.strictEqual(compareHotswapAgentVersions('1.4.2-SNAPSHOT', '1.4.2'), -1);
  });

  test('treats missing numeric parts as zero', () => {
    assert.strictEqual(compareHotswapAgentVersions('1.4', '1.4.1'), -1);
    assert.strictEqual(compareHotswapAgentVersions('1.4.1', '1.4'), 1);
  });
});

