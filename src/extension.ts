'use strict';

import * as vscode from 'vscode';

import OpenAI from 'openai';

import { getUpdateConfig } from './util/config';
import { ApiKeyStorage } from './util/apiKeyStorage';

let statusBarGenerateButton: vscode.StatusBarItem;
let statusBarContinueButton: vscode.StatusBarItem;

let promptPane: any = null;
let responsePane: any = null;

let openai: any = null;

let outputChannel: any = null;

var sendFullPromptTextOnContinueString: string = vscode.workspace.getConfiguration('dpb').get('sendFullPromptTextOnContinue') || 'false';

var sendFullPromptTextOnContinue = JSON.stringify(parseBool(sendFullPromptTextOnContinueString));

var debugString: string = vscode.workspace.getConfiguration('dpb').get('debug') || 'true';

var debug = parseBool(debugString);


export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Dual Pane Brain");

  // Initialize and get current instance of our Secret Storage
  ApiKeyStorage.init(context);
  const apiKeyStorage = ApiKeyStorage.instance;

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



  // Setup the register token command
  context.subscriptions.push(vscode.commands.registerCommand(setTokenCommand, async () => {
    // Building in flexibility for later - you're welcome future me!
    const instanceName = 'default';
    const tokenInput = await vscode.window.showInputBox({
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'areallycoolapikey',
      prompt: `Enter your api key for instance ${instanceName}`,
    }) || '';
    await apiKeyStorage.storeApiKey(instanceName, tokenInput);
  }));



  context.subscriptions.push(vscode.commands.registerCommand(generateCommandId, async () => {
    await initialGeneration(context, apiKeyStorage);
  }));

  context.subscriptions.push(vscode.commands.registerCommand(continueCommandId, async () => {
    await continueGeneration(context, apiKeyStorage);
  }));
}

/**
 * "Generate" command
 * @param context
 * @param apiKeyStorage
 * @returns
 */

async function initialGeneration(context: any, apiKeyStorage: ApiKeyStorage): Promise<void> {
  const apiModel: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('model')).replaceAll('\"', '') || '';
  const apiUrl: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('apiUrl')).replaceAll('\"', '') || '';
  const apiKey = await apiKeyStorage.getApiKey('default');

  openai = new OpenAI({
    baseURL: apiUrl,
    apiKey: apiKey,
  });

  // If there isn't already a second editor open, spawn one
  let panes = await openUpdateEditors();
  responsePane = panes.responsePane;
  promptPane = panes.promptPane;

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
    model: apiModel,
  };

  if (debug) {
    outputChannel.appendLine('Sending prompt:');
    outputChannel.appendLine(JSON.stringify(params, null, 2));
  }

  responsePane.edit((editBuilder: any) => {
    editBuilder.insert(responseRange.end, '\n\n---\n\n');
  });

  try {
    const stream = await openai.chat.completions.create(params);

    for await (const chunk of stream) {

      if (debug) {
        outputChannel.appendLine('Output Chunk:');
        outputChannel.appendLine(JSON.stringify(chunk, null, 2));
      }
      
      responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
      responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);

      // Append the text to the document
      responsePane.edit(async (editBuilder: any) => {
        editBuilder.insert(responseRange.end, `${chunk.choices[0]?.delta?.content}`);
      });
    }

    responseLastLine = await responseDocument.lineAt(responseDocument.lineCount - 1);
    responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);

  } catch (error) {
    outputChannel.appendLine(error);
  }
  return;
}

/**
 * "Continue" command
 * @param context 
 * @param authSettings 
 * @returns 
 */
async function continueGeneration(context: any, apiKeyStorage: ApiKeyStorage): Promise<void> {
  const apiModel: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('model')).replaceAll('\"', '') || '';
  const apiUrl: string = JSON.stringify(vscode.workspace.getConfiguration('dpb').get('apiUrl')).replaceAll('\"', '') || '';
  const apiKey = await apiKeyStorage.getApiKey('default');

  openai = new OpenAI({
    baseURL: apiUrl,
    apiKey: apiKey,
  });

  // If there isn't already a second editor open, spawn one
  let panes = await openUpdateEditors();
  responsePane = panes.responsePane;
  promptPane = panes.promptPane;

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

  const responseTextAll = await responseDocument.getText();

  const responseSelectedText = await responseDocument.getText(responseSelection);

  var responseSelectedLine = await responseDocument.lineAt(responsePane.selection.active.line);
  var responseSelectedRange = new vscode.Range(responseSelectedLine.range.start, responseSelectedLine.range.end);

  const responsePriorTextRange = new vscode.Range(responseSelectedLine.range.start, new vscode.Position(0, 0));
  const responsePriorText = await responseDocument.getText(responsePriorTextRange);

  var promptTextToSend = promptSelectedText ? promptSelectedText : (sendFullPromptTextOnContinue ? promptText : '');

  var responseTextToSend = responseSelectedText ? responseSelectedText : responsePriorText;

  outputChannel.appendLine('Sending prompt:');
  outputChannel.appendLine(promptTextToSend);
  outputChannel.appendLine(responseTextToSend);

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
    model: apiModel,
  };
  try {
    const stream = await openai.chat.completions.create(params);

    for await (const chunk of stream) {
      responseSelectedRange = new vscode.Range(responsePane.selection.start, responsePane.selection.end);

      // Append the text to the document
      responsePane.edit(async (editBuilder: any) => {
        editBuilder.insert(responseSelectedRange.end, `${chunk.choices[0]?.delta?.content}`);
      });
    }

    responseSelectedLine = await responseDocument.lineAt(responsePane.selection.active.line);
    responseSelectedRange = new vscode.Range(responseSelectedLine.range.start, responseSelectedLine.range.end);
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
    const newDocument = await openBlankDocument();
    responsePane = newDocument.document;
  }
  return {
    promptPane: promptPane,
    responsePane: responsePane
  };
}

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
