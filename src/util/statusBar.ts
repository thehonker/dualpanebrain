'use strict';

import * as vscode from 'vscode';

export class StatusBarItems {
  private static _context: vscode.ExtensionContext;
  
  // An object for holding all the status bar buttons
  public static statusBarButtons: any = {};

  /**
   * An object for storing various button configurations.
   * Each button configuration is identified by a key,
   * and contains properties: text, commandId, alignment, alignmentPriority.
   * statusbarItem is assigned later on
   */
  public static statusBarButtonConfig = {
    generateButton: {
      text: 'Generate',
      commandId: 'dpb.generate',
      alignment: 'Right',
      alignmentPriority: 100,
      statusBarItem: null,
    },
    continueButton: {
      text: 'Continue',
      commandId: 'dpb.continue',
      alignment: 'Right',
      alignmentPriority: 99,
      statusBarItem: null,
    },
    cancelButton: {
      text: 'Stop',
      commandId: 'dpb.stop',
      alignment: 'Right',
      alignmentPriority: 98,
      statusBarItem: null,
    }
  };

  public static async init(context: vscode.ExtensionContext): Promise<void> {
    StatusBarItems._context = context;
    await StatusBarItems.updateStatusBarItems(context);
  }

  // This function updates the status bar items when called
  public static async updateStatusBarItems(context: vscode.ExtensionContext) {
    // Loop through the keys of the statusBarButtonConfig object
    Object.keys(StatusBarItems.statusBarButtonConfig).forEach((key: string) => {
      // Get the text from the key configuration object
      const text = (StatusBarItems.statusBarButtonConfig as any)[key]['text'];
      // Get the commandId from the key configuration object
      const commandId = (StatusBarItems.statusBarButtonConfig as any)[key]['commandId'];
      // Get the alignment from the key configuration object
      const alignment = (StatusBarItems.statusBarButtonConfig as any)[key]['alignment'];
      // Get the alignmentPriority from the key configuration object
      const alignmentPriority = (StatusBarItems.statusBarButtonConfig as any)[key]['alignmentPriority'];

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
      // Assign the statusBarItem object to its respective key in the statusBarButtons object
      StatusBarItems.statusBarButtons[key] = statusBarItem;
      // Add the statusBarItem object to the subscriptions array in the provided context
      context.subscriptions.push(statusBarItem);
    });
  }
}
