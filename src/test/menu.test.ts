import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite.skip('Menu Configuration Test Suite', () => {
  let packageJson: any;

  suiteSetup(() => {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    packageJson = JSON.parse(packageContent);
  });

  test('Debug using Hotswap command exists', () => {
    const commands = packageJson.contributes.commands;
    const debugCommand = commands.find((cmd: any) => cmd.command === 'vaadin.debugUsingHotswap');
    assert.ok(debugCommand, 'vaadin.debugUsingHotswap command should exist');
    assert.equal(debugCommand.title, 'Debug using Hotswap Agent', 'Command title should be correct');
  });

  test('Context menus are properly configured', () => {
    const menus = packageJson.contributes.menus;
    assert.ok(menus, 'Menus section should exist');

    // Explorer context menu
    assert.ok(menus['explorer/context'], 'Explorer context menu should exist');
    const explorerMenu = menus['explorer/context'][0];
    assert.equal(explorerMenu.command, 'vaadin.debugUsingHotswap', 'Explorer menu should use correct command');
    assert.equal(
      explorerMenu.when,
      'resourceLangId == java && resourceExtname == .java',
      'Explorer menu should show only for Java files',
    );
    assert.equal(explorerMenu.group, '1_javaactions@99', 'Explorer menu should be in expected group');

    // Editor context menu
    assert.ok(menus['editor/context'], 'Editor context menu should exist');
    const editorMenu = menus['editor/context'][0];
    assert.equal(editorMenu.command, 'vaadin.debugUsingHotswap', 'Editor menu should use correct command');
    assert.equal(
      editorMenu.when,
      'editorLangId == java && resourceExtname == .java',
      'Editor menu should show only for Java files',
    );
    assert.equal(editorMenu.group, 'javadebug@99', 'Editor menu should be in expected group');

    // Editor title run menu
    assert.ok(menus['editor/title/run'], 'Editor title run menu should exist');
    const editorTitleMenu = menus['editor/title/run'][0];
    assert.equal(editorTitleMenu.command, 'vaadin.debugUsingHotswap', 'Editor title menu should use correct command');
    assert.equal(
      editorTitleMenu.when,
      'resourceExtname == .java',
      'Editor title menu should show only for Java files',
    );
    assert.equal(editorTitleMenu.group, '1_javadebug@30', 'Editor title menu should be in expected group');
  });
});
