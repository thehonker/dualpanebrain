'use strict';

import * as vscode from 'vscode';

import { Globals } from './globals';

const log = Globals.log;

export class EditorControl {
  public static promptPane: vscode.TextEditor;
  public static responsePane: vscode.TextEditor;
  
  public static setPromptPane(promptPane: vscode.TextEditor) {
    EditorControl.promptPane = promptPane || null;
  }
  
  public static setResponsePane(responsePane: vscode.TextEditor) {
    EditorControl.responsePane = responsePane || null;
  }

  public static async openBlankDocument(): Promise<Object> {
    log.debug('util/openBlankDocument:init() start');
    const viewColumn = vscode.ViewColumn.Beside;
    const document = await vscode.workspace.openTextDocument();
    await vscode.window.showTextDocument(document, viewColumn);
    return {
      document: document,
      viewColumn: viewColumn
    };
  }
  
  public static async updateOpenPanes(): Promise<Object | undefined> {
    log.debug('util/updateOpenPanes:init() start');
    var promptPaneFound = false;
    var responsePaneFound = false;
  
    var promptPane: null | vscode.TextEditor = null;
    var responsePane: null | vscode.TextEditor = null;
  
    const editors = vscode.window.visibleTextEditors || [];
    console.log(JSON.stringify(editors, null, 2));
  
    for (let i = 0; i < editors.length; i++) {
      if (editors[i].viewColumn === vscode.ViewColumn.One) {
        EditorControl.setPromptPane(editors[i]);
        promptPaneFound = true;
        promptPane = editors[i];
      }
      if (editors[i].viewColumn === vscode.ViewColumn.Two) {
        EditorControl.setResponsePane(editors[i]);
        responsePaneFound = true;
        responsePane = editors[i];
      }
      if (promptPaneFound && responsePaneFound) {
        return {
          promptPane: promptPane,
          responsePane: responsePane,
        };
      }
    }
  }
}
