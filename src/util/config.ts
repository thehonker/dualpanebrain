'use strict';

import * as vscode from 'vscode';

import { Globals } from './globals';

const configNamespace = Globals.configNamespace;
const log = Globals.log;

export const configEnum: any = {
  debug: {
    type: 'boolean',
    defaultValue: true,
  },
  sendFullPromptTextOnContinue: {
    type: 'boolean',
    defaultValue: true,
  },
};

export class Config {
  public static init(context: vscode.ExtensionContext): void {
    log.debug('util/config:init() start');
    Object.keys(configEnum).forEach(async (key) => {
      // Read the config from config.json
      const configEntry = await vscode.workspace.getConfiguration(configNamespace).get(key);
    });
    return;
  }

  public static async set(key: string, value: string): Promise<any> {
    log.debug('util/config:set() start');
    await vscode.workspace
      .getConfiguration(configNamespace)
      .update(
        key,
        value
      );

    let configEntry = await vscode.workspace.getConfiguration(configNamespace).get(key);
    return configEntry;
  }

  public static async get(key: string): Promise<any> {
    log.debug('util/config:get() start');
    let configEntry = await vscode.workspace.getConfiguration(configNamespace).get(key);
    return configEntry;
  }

  public static async getAll(): Promise<Object> {
    log.debug('util/config:getAll() start');
    const configObject = {};

    const keys = Object.keys(configEnum);

    for (let i = 0; i < keys.length; i++) {
      // Read the config from config.json
      let configEntry = await vscode.workspace.getConfiguration(configNamespace).get(configEnum[keys[i]]);
      (configObject as any)[keys[i]] = configEntry;
    }

    return configObject;
  }
}
