import * as assert from 'assert';
import {
  getJavaDebugConfigurationType,
  getJavaExtensionId,
  ORACLE_JAVA_EXTENSION_ID,
} from '../helpers/javaUtil';

suite('Java util extension detection', () => {
  const redHatExtension = { id: 'redhat.java' };
  const oracleExtension = { id: ORACLE_JAVA_EXTENSION_ID };

  test('prefers Red Hat Java when multiple supported extensions are present', () => {
    const id = getJavaExtensionId([oracleExtension, redHatExtension]);
    assert.strictEqual(id, 'redhat.java');
  });

  test('returns Oracle debug configuration type when Oracle Java is installed', () => {
    const type = getJavaDebugConfigurationType([oracleExtension]);
    assert.strictEqual(type, 'jdk');
  });

  test('falls back to Java debug type when no supported extension is available', () => {
    const type = getJavaDebugConfigurationType([]);
    assert.strictEqual(type, 'java');
  });
});
