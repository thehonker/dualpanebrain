'use strict';

import * as vscode from 'vscode';

import { Globals } from './globals';

import { ApiConfiguration } from './apiConfigurations';
import { GenerationCommands } from '../commands/generate';

const commandNamespace = Globals.configNamespace;
const log = Globals.log;

export class Commands {
  static commands = {
    setupApiInstance: {
      command: 'setupApiInstance',
      handler: ApiConfiguration.setupApiInstance,
    },
    updateApiKey: {
      command: 'updateApiKey',
      handler: ApiConfiguration.updateApiKey,
    },
    setDefaultInstance: {
      command: 'setDefaultInstance',
      handler: ApiConfiguration.setDefaultApiInstance,
    },
    generate: {
      command: 'generate',
      handler: GenerationCommands.generate,
    },
    continue: {
      command: 'continue',
      handler: GenerationCommands.continue,
    },
    stop: {
      command: 'stop',
      handler: null,
    }
  };
  
  static async init(context: vscode.ExtensionContext) {
    log.debug('util/commands:init() start');
    Object.keys(Commands.commands).forEach((key) => {
      log.debug(`Loading command configuration for ${key}`);
      const command = (Commands.commands as any)[key];
      context.subscriptions.push(
        vscode.commands.registerCommand(
          `${commandNamespace}.${command.command}`,
          command.handler
      ));
    });
  };
}
