'use strict';

import * as vscode from 'vscode';

import { ApiKeyStorage } from './apiKeyStorage';

const log = vscode.window.createOutputChannel("Dual Pane Brain");

const configNamespace = 'dpb';

const setTokenCommand = 'dpb.setToken';

export class ExtensionConfiguration {
  private static _instance: ExtensionConfiguration;

  constructor(private context: vscode.ExtensionContext) {}

  public static configEnum: any = {
    debug: {
      type: 'boolean',
      defaultValue: true,
    },
    sendFullPromptTextOnContinue: {
      type: 'boolean',
      defaultValue: false,
    },
    apiInstances: {
      type: 'apiInstance',
    }
  };

  public static configEntries: any = {};

  public static init(context: vscode.ExtensionContext): Object {
    ExtensionConfiguration._instance = new ExtensionConfiguration(context);
    Object.keys(ExtensionConfiguration.configEnum).forEach(async (key) => {
      // Retreieve the config from config.json
      const configEntry = await vscode.workspace.getConfiguration(configNamespace).get(key);
      
    });
    return {};
  }

  public static async set(key: string, value: string): Promise<void> {
    return;
  }

  public static async get(key: string): Promise<void> {
    return;
  }

  public static async getAll(): Promise<Object> {
    return {};
  }
}

/*
export async function getUpdateConfig() {
  if (config.debug) { log.appendLine('Enumerating configuration'); }
  Object.keys(configEnum).forEach((key) => {
    // Load up our entry
    const configEntry = configEnum[key as keyof typeof configEnum];

    // Print some debug
    if (config.debug) { log.appendLine(`Loading config for ${configNamespace}.${key}`); }
    if (config.debug) { log.appendLine(`Config entry type: ${configEntry.type}`); }
    if (config.debug) { log.appendLine(`Config entry default: ${configEntry.defaultValue}`); }

    // Attempt to load the value
    const configuredValue = vscode.workspace.getConfiguration(configNamespace).get(key) || null;

    // 
    if (configuredValue !== null) {
      if (config.debug) { log.appendLine(`Configured value: ${configuredValue}`); }
      switch (configEntry.type) {
        case 'string':
          config[key] = configuredValue.toString();
          break;
        case 'boolean':
          config[key] = parseBool(configuredValue.toString());
          break;
        default:
          break;
      }
    } else {
      config[key as keyof typeof configEnum] = configEntry.defaultValue;
    }
  });
};
*/

function parseBool(str: string) {
  const validStrings = ["true","t","yes","y","on","1"]; // These strings are equivalent to boolean values of `true`.
  const invalidStrings = ["false", "f", "no", "n", "off", "0"]; // These strings represent a false value.
  let result;
  if (validStrings.includes(str)) {
    return true; // If the string is found in valid strings, it will be considered as `true`.
  } else if (invalidStrings.includes(str)) {
    return false; // Otherwise, if it's found in invalid strings array, it would be considered as a `false` value.
  } else {
    result = /^\d+$/.test(str); // If the string is not matching any valid or invalid keywords above, we will check whether its number using regular expressions to match only numbers and return false if so.
    return !result; // Finally it returns true/false based on the matched value in regexp test method.
  }
}
