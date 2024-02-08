'use strict';

import * as vscode from 'vscode';

import { ApiKeyStorage } from './apiKeyStorage';

const configNamespace = 'dpb';

export class ApiConfiguration {
  private static _context: vscode.ExtensionContext;
  private static _apiKeyStorage: ApiKeyStorage;

  private _instanceName: string = '';
  private _apiUrl: string = '';
  private _apiKey: string = '';
  private _apiModel: string = '';

  constructor(private context: vscode.ExtensionContext) {}

  public async init(context: vscode.ExtensionContext): Promise<void> {
    ApiConfiguration._context = context;

    ApiKeyStorage.init(context);
    ApiConfiguration._apiKeyStorage = ApiKeyStorage.instance;

    const apiConfigurationsString = await vscode.workspace.getConfiguration(configNamespace).get('apiConfigurations');
    const apiConfigurations = JSON.parse(apiConfigurationsString as any);

    Object.keys(apiConfigurations).forEach(async (key) => {
      const configuration = apiConfigurations[key];
      const apiKey = await ApiConfiguration._apiKeyStorage.getApiKey(configuration.instanceName);
      this.setupApiConfiguration({
        instanceName: configuration.instanceName,
        apiUrl: configuration.apiUrl,
        apiKey: apiKey,
        apiModel: configuration.apiModel,
      });
    });

    return;
  }

  public async setupApiConfiguration(options: any) {
    this._instanceName = options.instanceName;
    this._apiUrl = options.apiUrl;
    this._apiKey = options.apiKey;
    this._apiModel = options.apiModel;

    const apiConfigurationObject = {
      instanceName: options.instanceName,
      apiUrl: options.apiUrl,
      apiModel: options.apiModel,
    };
  
    ApiConfiguration._apiKeyStorage.storeApiKey(
      options.instanceName,
      options.apiKey as string
    );

    // Store the rest of the api configuration
    await vscode.workspace
      .getConfiguration(configNamespace)
      .update(
        `apiConfigurations.${apiConfigurationObject.instanceName}`,
        JSON.stringify(apiConfigurationObject)
      );
  }

  public async getApiConfiguration() {
    const apiConfigurationObject = {
      instanceName: this._instanceName,
      apiUrl: this._apiUrl,
      apiModel: this._apiModel,
      apiKey: this._apiKey,
    };

    return apiConfigurationObject;
  }
}
