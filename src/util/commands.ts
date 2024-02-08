'use strict';

import * as vscode from 'vscode';

import { ApiKeyStorage, promptApiKey } from './apiKeyStorage';

import {  } from '../commands/generate';

const log = vscode.window.createOutputChannel("Dual Pane Brain");

const commandNamespace = 'dpb';

class CommandEntry {
  public text: string;
  public command: string;
  public handler: null | Function;
  
  constructor(options: CommandEntry) {
    this.text = options.text;
    this.command = options.command;
    this.handler = options.handler;
  }
}

const commands = {
  setToken: {
    command: 'setToken',
    handler: promptApiKey,
  },
};

export async function init(context: vscode.ExtensionContext) {
  ApiKeyStorage.init(context);
  const apiKeyStorage = ApiKeyStorage.instance;
  
  Object.keys(commands).forEach((key) => {
    const command = (commands as any)[key];
    
  // Setup the register token command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${commandNamespace}.${command.command}`,
      command.handler
    ));
  });
};
