'use strict';

import * as vscode from 'vscode';

import { Config } from './util/config';

import { ApiConfiguration } from './util/apiConfigurations';
import { ApiKeyStorage } from './util/apiKeyStorage';
import { Commands } from './util/commands';
import { StatusBarItems } from './util/statusBar';

export async function activate(context: vscode.ExtensionContext) {

  // Initialize and get current instance of our Secret Storage
  ApiKeyStorage.init(context);
  ApiConfiguration.init(context);
  Config.init(context);
  Commands.init(context);
  StatusBarItems.init(context);
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
