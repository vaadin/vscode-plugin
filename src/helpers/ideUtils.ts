import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getProjectFilePath } from './projectFilesHelpers';

const execFileAsync = promisify(execFile);

export async function focusWindow(): Promise<void> {
  try {
    const focused =
      (process.platform === 'darwin' && (await focusMac())) ||
      (process.platform === 'win32' && (await focusWindows())) ||
      (await focusLinux());

    if (!focused) {
      console.warn('Unable to bring VS Code window to front');
    }
  } catch (error) {
    console.error('Failed to bring VS Code window to front', error);
  }
}

async function focusMac(): Promise<boolean> {
  const scripts = [
    'tell application id "com.microsoft.VSCode" to activate',
    'tell application id "com.microsoft.VSCodeInsiders" to activate',
    `tell application "${vscode.env.appName}" to activate`,
  ];

  for (const script of scripts) {
    try {
      await execFileAsync('osascript', ['-e', script]);
      return true;
    } catch {}
  }

  return false;
}

async function focusWindows(): Promise<boolean> {
  const targets = [
    vscode.env.appName,
    'Visual Studio Code',
    'Visual Studio Code - Insiders',
  ].map((name) => name.replace(/'/g, "''"));

  const psScript = [
    '$wshell = New-Object -ComObject WScript.Shell',
    '$activated = $false',
    ...targets.map((name) => `$activated = $activated -or $wshell.AppActivate('${name}')`),
    '$activated',
  ].join('; ');

  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript]);
    return stdout.toString().trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}

async function focusLinux(): Promise<boolean> {
  const commands: Array<{ cmd: string; args: string[] }> = [
    { cmd: 'wmctrl', args: ['-xa', 'code'] },
    { cmd: 'wmctrl', args: ['-xa', 'code-url-handler'] },
    { cmd: 'xdotool', args: ['search', '--class', 'code', 'windowactivate'] },
  ];

  const workspace = getProjectFilePath();
  const fallbackArgs = workspace ? ['--reuse-window', workspace] : ['--reuse-window'];
  commands.push({ cmd: process.execPath, args: fallbackArgs });

  for (const { cmd, args } of commands) {
    try {
      await execFileAsync(cmd, args);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        continue;
      }
    }
  }

  return false;
}
