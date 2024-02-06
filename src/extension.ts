'use strict';

import * as vscode from 'vscode';

import OpenAI from 'openai';

import { URL } from 'url';

let statusBarGenerateButton: vscode.StatusBarItem;
let statusBarContinueButton: vscode.StatusBarItem;

let promptPane: any = null;
let responsePane: any = null;

let openai: any = null;

let outputChannel: any = null;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Dual Pane Brain");

  // Initialize and get current instance of our Secret Storage
  AuthSettings.init(context);
  const authSettings = AuthSettings.instance;

  const generateCommandId = 'dpb.generate';
  const continueCommandId = 'dpb.continue';
  const setTokenCommand = 'dpb.setToken';
  
  statusBarGenerateButton = vscode.window.createStatusBarItem(generateCommandId, vscode.StatusBarAlignment.Right, 100);
  statusBarGenerateButton.command = generateCommandId;
  statusBarGenerateButton.text = 'Generate';
  context.subscriptions.push(statusBarGenerateButton);

  statusBarContinueButton = vscode.window.createStatusBarItem(continueCommandId, vscode.StatusBarAlignment.Right, 99);
  statusBarContinueButton.command = continueCommandId;
  statusBarContinueButton.text = 'Continue';
  context.subscriptions.push(statusBarContinueButton);

  // initialize status bar on extension activation
	updateStatusBarItems();

  context.subscriptions.push(vscode.commands.registerCommand(setTokenCommand, async () => {
    const tokenInput = await vscode.window.showInputBox();
    await authSettings.storeAuthData(tokenInput);
  }));

  context.subscriptions.push(vscode.commands.registerCommand(generateCommandId, async () => {
    await initialGeneration(context, authSettings);
  }));

  context.subscriptions.push(vscode.commands.registerCommand(continueCommandId, async () => {
    await continueGeneration(context, authSettings);
  }));
}

async function initialGeneration(context: any, authSettings: AuthSettings): Promise<void> {
  const apiModel: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('model')).replaceAll('\"', '') || '';
  const apiUrl: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('apiUrl')).replaceAll('\"', '') || '';
  const apiKey = await authSettings.getAuthData();

  openai = new OpenAI({
    baseURL: apiUrl,
    apiKey: apiKey,
  });
  
  // If there isn't already a second editor open, spawn one
  await openUpdateEditors();

  // Get contents of first editor
  if (!promptPane) {
    vscode.window.showInformationMessage('Nothing to prompt with!');
    return;
  }

  // Get contents of first editor
  if (!responsePane) {
    let panes = await openUpdateEditors();
    responsePane = panes.responsePane;
  }

  const promptDocument = promptPane.document;
  const promptSelection = promptPane.selection;

  const promptText = await promptDocument.getText();
  const promptSelectedText = await promptDocument.getText(promptSelection);

  const responseDocument = responsePane.document;
  var responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
  var responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);

  var textToSend = promptSelectedText ? promptSelectedText : promptText;

  const params = {
    messages: [{
      role: 'user',
      content: textToSend
    }],
    stream: true,
  };

    
  responsePane.edit((editBuilder: any) => {
    editBuilder.insert(responseRange.end, '\n\n~~~\n\n');
  });

  try {
    const stream = await openai.chat.completions.create(params);

    for await (const chunk of stream) {
      outputChannel.appendLine(JSON.stringify(chunk, null, 2));
      responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
      responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
   
      // Append the text to the document
      responsePane.edit(async (editBuilder: any) => {
        editBuilder.insert(responseRange.end, `${chunk.choices[0]?.message?.content}`);
      });
    }

    responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
    responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
  
    responsePane.edit((editBuilder: any) => {
      editBuilder.insert(responseRange.end, '\n\n~~~\n\n');
    });
  } catch (error) {
    outputChannel.appendLine(error);
  }
  return;
}

async function continueGeneration(context: any, authSettings: AuthSettings): Promise<void> {
  const apiModel: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('model')).replaceAll('\"', '') || '';
  const apiUrl: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('apiUrl')).replaceAll('\"', '') || '';
  const apiKey = await authSettings.getAuthData();

  openai = new OpenAI({
    baseURL: apiUrl,
    apiKey: apiKey,
  });

  // If there isn't already a second editor open, spawn one
  await openUpdateEditors();

  // Get contents of first editor
  if (!promptPane) {
    vscode.window.showInformationMessage('Nothing to prompt with!');
    return;
  }
    // Get contents of first editor
  if (!responsePane) {
    let panes = await openUpdateEditors();
    responsePane = panes.responsePane;
  }

  const promptDocument = promptPane.document;
  const promptSelection = promptPane.selection;

  const promptText = await promptDocument.getText();
  const promptSelectedText = await promptDocument.getText(promptSelection);

  const responseDocument = responsePane.document;
  const responseSelection = responsePane.selection;

  const responseText = await responseDocument.getText();
  const responseSelectedText = await responseDocument.getText(responseSelection);

  var responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
  var responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);

  var promptTextToSend = promptSelectedText ? promptSelectedText : promptText;

  var responseTextToSend = responseSelectedText ? responseSelectedText : responseText;

  const params = {
    messages: [
      {
        role: 'user',
        content: promptTextToSend
      },
      {
        role: 'user',
        content: responseTextToSend
      }
    ],
    stream: true,
  };
  try {
    const stream = await openai.chat.completions.create(params);

    for await (const chunk of stream) {
      outputChannel.appendLine(JSON.stringify(chunk, null, 2));
      responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
      responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
   
      // Append the text to the document
      responsePane.edit(async (editBuilder: any) => {
        editBuilder.insert(responseRange.end, `${chunk.choices[0]?.message?.content}`);
      });
    }

    responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
    responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);

  } catch (error) {
    outputChannel.appendLine(error);
  }
  return;
}

function updateStatusBarItems(): void {
  statusBarGenerateButton.show();
  statusBarContinueButton.show();
}

export async function openBlankDocument() {
  const viewColumn = vscode.ViewColumn.Beside;
  const document = await vscode.workspace.openTextDocument();
  await vscode.window.showTextDocument(document, viewColumn);
  return {
    document: document,
    viewColumn: viewColumn
  };
}

// Update globals of left/right editors
export async function openUpdateEditors() {
  const editors = vscode.window.visibleTextEditors || [];
  console.log(JSON.stringify(editors, null, 2));

  for (let i = 0; i < editors.length; i++) {
    if (editors[i].viewColumn === vscode.ViewColumn.One) {
      promptPane = editors[i] || null;
    }
    if (editors[i].viewColumn === vscode.ViewColumn.Two) {
      responsePane = editors[i] || null;
    }
  }

  if (responsePane === null) {
    await openBlankDocument();
  }
  return {
    promptPane: promptPane,
    responsePane: responsePane
  };
}


export class AuthSettings {
  private static _instance: AuthSettings;

  constructor(private secretStorage: vscode.SecretStorage) {}

  static init(context: vscode.ExtensionContext): void {
      /*
      Create instance of new AuthSettings.
      */
      AuthSettings._instance = new AuthSettings(context.secrets);
  }

  static get instance(): AuthSettings {
      /*
      Getter of our AuthSettings existing instance.
      */
      return AuthSettings._instance;
  }

  async storeAuthData(token?: string): Promise<void> {
      /*
      Update values in bugout_auth secret storage.
      */
      if (token) {
          this.secretStorage.store("dualPaneBrain_openai_token", token);
      }
  }

  async getAuthData(): Promise<string | undefined> {
      /*
      Retrieve data from secret storage.
      */
      return await this.secretStorage.get("dualPaneBrain_openai_token");
  }
}
