import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Menu Configuration Test Suite', () => {
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
    
    // Test explorer context menu
    assert.ok(menus['explorer/context'], 'Explorer context menu should exist');
    const explorerMenu = menus['explorer/context'][0];
    assert.equal(explorerMenu.command, 'vaadin.debugUsingHotswap', 'Explorer menu should use correct command');
    assert.equal(explorerMenu.when, 'resourceExtname == .java', 'Explorer menu should show only for Java files');
    assert.equal(explorerMenu.group, 'debug@2', 'Explorer menu should be in debug group');
    
    // Test editor context menu
    assert.ok(menus['editor/context'], 'Editor context menu should exist');
    const editorMenu = menus['editor/context'][0];
    assert.equal(editorMenu.command, 'vaadin.debugUsingHotswap', 'Editor menu should use correct command');
    assert.equal(editorMenu.when, 'resourceExtname == .java', 'Editor menu should show only for Java files');
    assert.equal(editorMenu.group, 'debug@2', 'Editor menu should be in debug group');
  });
});