'use strict';

import * as vscode from 'vscode';

import { Globals } from './globals';

const log = Globals.log;

/**
 * An object for storing various button configurations.
 * Each button configuration is identified by a key,
 * and contains properties: text, commandId, alignment, alignmentPriority.
 * statusbarItem is assigned later on
 */
export const statusBarButtonConfig = {
  generateButton: {
    text: 'Generate',
    commandId: 'dpb.generate',
    alignment: 'Right',
    alignmentPriority: 1000,
  },
  continueButton: {
    text: 'Continue',
    commandId: 'dpb.continue',
    alignment: 'Right',
    alignmentPriority: 999,
  }
};

export class StatusBarItems {
  private static _context: vscode.ExtensionContext;
  
  public static async init(context: vscode.ExtensionContext): Promise<void> {
    log.debug('util/statusBar:init() start');
    StatusBarItems._context = context;
    await StatusBarItems.updateStatusBarItems();
  }

  // This function updates the status bar items when called
  public static async updateStatusBarItems() {
    log.debug('util/statusBar:updateStatusBarItems() start');
    // Loop through the keys of the statusBarButtonConfig object
    Object.keys(statusBarButtonConfig).forEach((key: string) => {
      // Get the text from the key configuration object
      const text = (statusBarButtonConfig as any)[key]['text'];
      // Get the commandId from the key configuration object
      const commandId = (statusBarButtonConfig as any)[key]['commandId'];
      // Get the alignment from the key configuration object
      const alignment = (statusBarButtonConfig as any)[key]['alignment'];
      // Get the alignmentPriority from the key configuration object
      const alignmentPriority = (statusBarButtonConfig as any)[key]['alignmentPriority'];

      // Get the enumerated value from VS Code's StatusBarAlignment object
      const alignmentEnumerated = Number(vscode.StatusBarAlignment[alignment]);

      // Create a new StatusBarItem object with the commandId, alignmentEnumerated, and alignmentPriority
      const statusBarItem = vscode.window.createStatusBarItem(
        // Provide command ID as the first argument
        commandId,
        // Provide alignment value as the second argument
        // NOTE: VS Code's StatusBarAlignment requires a specific value, so we're using a numeric constant
        alignmentEnumerated,
        // Provide alignmentPriority as the third argument
        alignmentPriority
      );

      statusBarItem.command = commandId;
      statusBarItem.text = text;

      // Add the statusBarItem object to the subscriptions array in the provided context
      // StatusBarItems._context.subscriptions.push(statusBarItem);
      statusBarItem.show();
    });
  }
}
