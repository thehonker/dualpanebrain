'use strict';

import * as vscode from 'vscode';

import { ApiConfiguration } from '../util/apiConfigurations';
import { Globals } from '../util/globals';
import { EditorControl } from '../util/editorControl';

const log = Globals.log;

export class GenerationCommands {
  /**
   * "Generate" command
   * @param context vscode.ExtensionContext
   * @returns
   */
  public static async generate(context: vscode.ExtensionContext): Promise<void> {
    log.debug('commands/generate:init() start');

    const apiConfiguration = await ApiConfiguration.getApiConfiguration(ApiConfiguration.defaultApiInstance);

    const apiUrl = ApiConfiguration.getApiConfiguration(apiConfiguration.instanceUUID);
    await EditorControl.updateOpenPanes();

    const promptDocument = EditorControl.promptPane.document;
    const promptSelection = EditorControl.promptPane.selection;
  
    const promptText = promptDocument.getText();
    const promptSelectedText = promptDocument.getText(promptSelection);

    const responseDocument = EditorControl.responsePane.document;
    var responseLastLine = responseDocument.lineAt(responseDocument.lineCount - 1);
    var responseRange = new vscode.Range(responseLastLine.range.start, responseLastLine.range.end);
  
    var textToSend = promptSelectedText ? promptSelectedText : promptText;
    const params = {
      messages: [{
        role: 'user',
        content: textToSend
      }],
      stream: true,
      model: apiConfiguration.apiModel,
    };

    EditorControl.responsePane.edit((editBuilder: any) => {
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

  }
};
