import * as vscode from 'vscode';

import { ampli, EventOptions } from '../ampli';
import { getPluginVersion } from "./properties";
import { resolveVaadinHomeDirectory } from './projectFilesHelpers';
import { randomUUID } from 'crypto';
import path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';

const eventOptions: EventOptions = {
  platform: vscode.env.appName,
  device_model: 'vscode',
  os_name: os.type(),
  os_version: os.release(),
  app_version: getPluginVersion(),
};

let userId: string | undefined;

let vaadiner: boolean | undefined;

export function trackPluginInitialized() {
    if (isEnabled()) {
        ampli.pluginInitialized(getUserId(), { ProKey: getProKeyDigest(), Vaadiner: isVaadiner()});
    }
}

export function trackProjectCreated(url: string) {
    if (isEnabled()) {
        ampli.projectCreated(getUserId(), { downloadUrl: url, Vaadiner: isVaadiner() });
    }
}

function getUserId() {
    if (userId === undefined) {
        userId = getUserKey();
        ampli.load({ environment: 'ideplugins' });
        ampli.identify(userId, eventOptions)
    }
    return userId;
}

function isEnabled() {
    return vscode.env.isTelemetryEnabled && vscode.workspace.getConfiguration('vaadin').get('sendUsageStatistics');
}

function getUserKey(): string {
    const vaadinHome = resolveVaadinHomeDirectory();
    if (!fs.existsSync(vaadinHome)) {
      fs.mkdirSync(vaadinHome, { recursive: true });
    }
  
    const userKeyFile = path.join(vaadinHome, 'userKey');
    if (fs.existsSync(userKeyFile)) {
      const content = fs.readFileSync(userKeyFile, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed.key;
    } else {
      const key = `user-${randomUUID()}`;
      const keyObject = { key };
      fs.writeFileSync(userKeyFile, JSON.stringify(keyObject), 'utf-8');
      return key;
    }
}

function getProKey(): any | undefined {
    const vaadinHome = resolveVaadinHomeDirectory();
    if (!fs.existsSync(vaadinHome)) {
      return;
    }
  
    const proKeyFile = path.join(vaadinHome, 'proKey');
    try {
        fs.accessSync(proKeyFile);
        const content = fs.readFileSync(proKeyFile, 'utf-8');
        return JSON.parse(content);
    } catch(e) {
        return;
    }
    
}

function isVaadiner(): boolean {
  if (vaadiner === undefined) {
    const proKey = getProKey();
    if (proKey) {
      vaadiner = proKey.hasOwnProperty('username') && proKey.username.endsWith('@vaadin.com');
    } else {
      vaadiner = false;
    }
  }
  return vaadiner === true;
}

function getProKeyDigest(): string | undefined {
  const proKey = getProKey();
  if (proKey) {
    const buffer = Buffer.from(proKey.proKey, 'utf-8');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  return;
}
