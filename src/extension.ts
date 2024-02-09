'use strict';

import * as vscode from 'vscode';

import { Config } from './util/config';

import { ApiConfiguration } from './util/apiConfigurations';
import { ApiKeyStorage } from './util/apiKeyStorage';
import { Commands } from './util/commands';
import { StatusBarItems } from './util/statusBar';

export async function activate(context: vscode.ExtensionContext) {

  // Initialize and get current instance of our Secret Storage
  await ApiKeyStorage.init(context);
  await ApiConfiguration.init(context);
  await Config.init(context);
  await Commands.init(context);
  await StatusBarItems.init(context);
}
