'use strict';

import * as vscode from 'vscode';

export class Globals {
  public static configNamespace: string = 'dpb';
  public static commandNamespace: string = 'dpb';
  public static secretNamespace: string = 'dpb';

  public static log: vscode.LogOutputChannel = vscode.window.createOutputChannel("Dual Pane Brain", { log: true });
}
