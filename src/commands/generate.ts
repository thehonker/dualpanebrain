'use strict';

import * as vscode from 'vscode';

import { ApiConfiguration } from '../util/apiConfigurations';
import { Globals } from '../util/globals';
import { EditorControl } from '../util/editorControl';
import { Config } from '../util/config';

const log = Globals.log;


export class apiChatMessage {
  messages: Array<Object> = [];
  stream: boolean = true;
  model: string = '';
}

export class GenerationCommands {
  /**
   * "Generate" command
   * @param context vscode.ExtensionContext
   * @returns
   */
  public static async generate(context: vscode.ExtensionContext): Promise<void> {
    log.debug('commands/generate:generate() start');

    // TODO: allow user to select api instances
    const api = await (ApiConfiguration.apiConfigurations as any)[ApiConfiguration.defaultApiInstance];

    await EditorControl.updateOpenPanes();

    const promptDocument = EditorControl.promptPane.document;
    const promptSelection = EditorControl.promptPane.selection;
  
    const promptText = promptDocument.getText();
    const promptSelectedText = promptDocument.getText(promptSelection);

    const responseDocument = EditorControl.responsePane.document;
    var responseLastLine = responseDocument.lineAt(responseDocument.lineCount - 1);
    var responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
  
    var textToSend = promptSelectedText ? promptSelectedText : promptText;
    const params: apiChatMessage = {
      messages: [{
        role: 'user',
        content: textToSend
      }],
      stream: true,
      model: api.apiModel,
    };

    EditorControl.responsePane.edit((editBuilder: any) => {
      editBuilder.insert(responseRange.end, '\n\n---\n\n');
    });

    try {
      const stream = await api.openai.chat.completions.create(params);
  
      for await (const chunk of stream) {
        responseLastLine = responseDocument.lineAt(responseDocument.lineCount - 1);
        responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
  
        // Append the text to the document
        EditorControl.responsePane.edit(async (editBuilder: any) => {
          editBuilder.insert(responseRange.end, `${chunk.choices[0]?.delta?.content}`);
        });
      }
  
      responseLastLine = responseDocument.lineAt(responseDocument.lineCount - 1);
      responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
  
    } catch (error) {
      log.error(error as Error);
    }
  }

  public static async continue(context: vscode.ExtensionContext): Promise<void> {
    log.debug('commands/generate:continue() continue');

    const sendFullPromptTextOnContinue = await Config.get('sendFullPromptTextOnContinue');

    // TODO: allow user to select api instances
    const api = await ApiConfiguration.getApiConfiguration(ApiConfiguration.defaultApiInstance);

    await EditorControl.updateOpenPanes();

    const promptDocument = EditorControl.promptPane.document;
    const promptSelection = EditorControl.promptPane.selection;
  
    const promptText = await promptDocument.getText();
    const promptSelectedText = await promptDocument.getText(promptSelection);
  
    const responseDocument = EditorControl.responsePane.document;
    const responseSelection = EditorControl.responsePane.selection;
  
    const responseTextAll = await responseDocument.getText();
  
    const responseSelectedText = await responseDocument.getText(responseSelection);
  
    var responseSelectedLine = await responseDocument.lineAt(EditorControl.responsePane.selection.active.line);
    var responseSelectedRange = new vscode.Range(responseSelectedLine.range.start, responseSelectedLine.range.end);
  
    const responsePriorTextRange = new vscode.Range(responseSelectedLine.range.start, new vscode.Position(0, 0));
    const responsePriorText = await responseDocument.getText(responsePriorTextRange);
  
    var promptTextToSend = promptSelectedText ? promptSelectedText : (sendFullPromptTextOnContinue ? promptText : '');
  
    var responseTextToSend = responseSelectedText ? responseSelectedText : responsePriorText;
    const params: apiChatMessage = {
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
      model: api.apiModel,
    };

    try {
      const stream = await api.openai.chat.completions.create(params);
  
      for await (const chunk of stream) {
        responseSelectedRange = new vscode.Range(EditorControl.responsePane.selection.start, EditorControl.responsePane.selection.end);
  
        // Insert into the document at cursor
        EditorControl.responsePane.edit(async (editBuilder: any) => {
          editBuilder.insert(responseSelectedRange.end, `${chunk.choices[0]?.delta?.content}`);
        });
      }
  
      responseSelectedLine = await responseDocument.lineAt(EditorControl.responsePane.selection.active.line);
      responseSelectedRange = new vscode.Range(responseSelectedLine.range.start, responseSelectedLine.range.end);
    } catch (error) {
      log.error(error as Error);
    }
  }
};
