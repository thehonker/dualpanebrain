'use strict';

import * as crypto from 'node:crypto';

import * as vscode from 'vscode';

import OpenAI from 'openai';

import { ApiKeyStorage } from './apiKeyStorage';
import { Globals } from './globals';
import { parseBool } from './util';

const configNamespace = Globals.configNamespace;
const log = Globals.log;

export class ApiInstance {
  public instanceUUID: string = '';
  public instanceName: string = '';
  public apiUrl: string = '';
  public apiModel: string = '';
  public openai: any = null;
}

export class ApiConfiguration {
  private static _apiKeyStorage: ApiKeyStorage;

  public static apiConfigurations: Object = {};

  public static defaultApiInstance: string = '';

  public static async init(context: vscode.ExtensionContext): Promise<void> {
    log.debug('util/apiConfiguration:init() start');

    ApiConfiguration._apiKeyStorage = ApiKeyStorage.instance;

    log.debug('Loading api configurations object from settings.json');

    const apiConfigurationsString = await vscode.workspace.getConfiguration(configNamespace).get('apiConfigurations');
    if (!apiConfigurationsString) {
       vscode.window.showErrorMessage('No apiConfigurations, run \"dpb.setupApiInstance\" to add one');
       return;
    }
    const configuredApiConfigurations = JSON.parse(apiConfigurationsString as any);

    const keys = Object.keys(configuredApiConfigurations);

    for (let i = 0; i < keys.length; i++) {
      const configuration = configuredApiConfigurations[keys[i]];
      const apiKey = await ApiConfiguration._apiKeyStorage.getApiKey(configuration.instanceUUID) || '';
      ApiConfiguration.setupApiConfiguration({
        instanceUUID: configuration.instanceUUID,
        instanceName: configuration.instanceName,
        apiUrl: configuration.apiUrl,
        apiModel: configuration.apiModel,
        apiKey: apiKey,
      });

      // If it's the first one we loaded, set it as default
      if (i === 0) {
        ApiConfiguration.setDefaultApiInstance(configuration.instanceUUID);
      }
    }
  }

  /**
   * Set the default api instance to use
   */
  public static async setDefaultApiInstance(instanceUUID: string) {
    log.debug('util/apiConfiguration:setDefaultApiInstance() start');
    if (instanceUUID) {
      ApiConfiguration.defaultApiInstance = instanceUUID;
    }
  }


  /**
   * Setup an api configuration in persistent configuration and memory
   * options = {
   *   instanceUUID,
   *   instanceName,
   *   apiUrl,
   *   apiModel,
   *   apiKey,
   * }
   * @param options Object
   */
  public static async setupApiConfiguration(options: any) {
    log.debug('util/apiConfiguration:setupApiConfiguration() start');

    if (!options.instanceUUID) {
      log.debug('util/apiConfiguration:setupApiConfiguration() called without options.instanceUUID');
      return;
    }
    // Fetch the existing config if any
    const existingApiConfigurationString = await 
      vscode.workspace
        .getConfiguration(configNamespace)
        .get('apiConfigurations')
        || null;

    var existingApiConfiguration: any = false;
    if (existingApiConfigurationString!== null) {
      existingApiConfiguration = JSON.parse(existingApiConfigurationString as string);
    }

    // This line will check if options.apiKey is undefined or null 
    // and assign an empty string as fallback using the logical nullish assignment (??).
    // Then we can safely use .length property on it without causing any errors.
    if ((options.apiKey ?? '').length !== 0) { 
      await ApiConfiguration._apiKeyStorage.storeApiKey(
        options.instanceUUID,
        // This line will check if options.apiKey is undefined or null and assign an 
        // empty string as fallback using the logical nullish assignment (??) to ensure that 
        // it's never going to be falsy value while storing in storage function below.
        options.apiKey ?? ''
      );
    }
    
    // Fetch the api key back
    const apiKey = await ApiConfiguration._apiKeyStorage.getApiKey(options.instanceUUID) || '';

    // Setup the openai library
    const openai = new OpenAI({
      // This line checks whether 'options.apiUrl' exists and if not it will 
      // check for the property of `existingApiConfiguration`. If both are undefined 
      // or null then it would default to a zero-length string as fallback using optional chaining operator (??).
      baseURL: options.apiUrl ?? existingApiConfiguration?.apiUrl,
      // This line checks whether 'options.apiKey' exists and if not it will check for the property 
      // of `existingApiConfiguration`. If both are undefined or null then it would default to a 
      // zero-length string as fallback using optional chaining operator (??).
      apiKey: options.apiKey ?? existingApiConfiguration?.apiKey,
    });

    // Update the config list
    (ApiConfiguration.apiConfigurations as any)[options.instanceUUID] = { 
      instanceUUID: options.instanceUUID,
      instanceName: options.instanceName,
      apiUrl: options.apiUrl,
      apiModel: options.apiModel,
      openai: openai,
    };

    const filteredApiConfig = {};

    const keys = Object.keys(ApiConfiguration.apiConfigurations);

    for (let i = 0; i < keys.length; i++) {
      (filteredApiConfig as any)[keys[i]] = {
        instanceUUID: (ApiConfiguration.apiConfigurations as any)[keys[i]].instanceUUID,
        instanceName: (ApiConfiguration.apiConfigurations as any)[keys[i]].instanceName,
        apiUrl: (ApiConfiguration.apiConfigurations as any)[keys[i]].apiUrl,
        apiModel: (ApiConfiguration.apiConfigurations as any)[keys[i]].apiModel,
      };
    }

    log.debug('Filtered api config:');
    log.debug(JSON.stringify(filteredApiConfig, null, 2));

    // Store the rest of the configuration
    await vscode.workspace
      .getConfiguration(configNamespace)
      .update(
        'apiConfigurations',
        JSON.stringify(filteredApiConfig),
        vscode.ConfigurationTarget.Global
      );

    if (ApiConfiguration.defaultApiInstance === '') {
      ApiConfiguration.setDefaultApiInstance(options.instanceUUID);
      log.debug(`Setting ${options.instanceUUID} as default`);
    }

    log.debug(`API Instance ${options.instanceUUID} configured successfully`);
  }

  /**
   * Get api configuration
   * @param instanceUUID - the instance uuid to get configuration for
   */
  public static async getApiConfiguration(instanceUUID: string): Promise<ApiInstance> {
    log.debug('util/apiConfiguration:getApiConfiguration() start');

    const apiConfigurationString = await 
      vscode.workspace
        .getConfiguration(configNamespace)
        .get('apiConfigurations')
        || null;

    var apiConfiguration = null;
    if (apiConfigurationString !== null) {
      apiConfiguration = JSON.parse(apiConfigurationString as string);
    }

    return { 
      instanceUUID: apiConfiguration.instanceUUID,
      instanceName: apiConfiguration.instanceName,
      apiUrl: apiConfiguration.apiUrl,
      apiModel: apiConfiguration.apiModel,
      openai: apiConfiguration.openai,
    };
  }

  /**
   * A helper function that interactively prompts the user to setup an api instance
   *
   * This function should be called within the context of a vscode extension.
   *
   * @param context - The vscode.ExtensionContext object containing information about the extension.
   * @returns A Promise that resolves when the API key has been successfully stored.
   */
  public static async setupApiInstance(context: vscode.ExtensionContext): Promise<void> {
    log.debug('util/apiConfiguration:setupApiInstance() start');

    const instanceUUID = crypto.randomUUID();

    const instanceName = await vscode.window.showInputBox({
      prompt: 'Instance Display Name',
      ignoreFocusOut: true,
      password: false
    }) || instanceUUID;

    const instanceModel = await vscode.window.showInputBox({
      prompt: 'Instance Model',
      ignoreFocusOut: true,
      password: false
    }) || '';

    const instanceApiUrl = await vscode.window.showInputBox({
      prompt: 'Instance API URL',
      ignoreFocusOut: true,
      password: false
    }) || '';

    // Prompt the user to enter the API key for the specified instance.
    const instanceApiKey = await vscode.window.showInputBox({
      prompt: `Instance API Key`,
      ignoreFocusOut: true,
      password: true,
    }) || '';

    ApiConfiguration.setupApiConfiguration({
      instanceUUID: instanceUUID,
      instanceName:instanceName,
      apiUrl: instanceApiUrl,
      apiModel: instanceModel,
      apiKey: instanceApiKey,
    });
  }

  /**
   * A helper function that prompts the user to enter an API key and stores it using the APIKeyStorage class.
   *
   * This function should be called within the context of a vscode extension.
   *
   * @param context - The vscode.ExtensionContext object containing information about the extension.
   * @returns A Promise that resolves when the API key has been successfully stored.
   */
  public static async updateApiKey(context: vscode.ExtensionContext): Promise<void> {
    log.debug('util/apiConfiguration:updateApiKey() start');
  
    // Prompt the user to enter an instance UUID for the API key.
    const instanceUUID = await vscode.window.showInputBox({
      prompt: 'Instance UUID (from settings.json)',
      ignoreFocusOut: true,
      password: false
    }) || 'default';
  
    // Load the rest of the config for this instance
    const apiConfig = await ApiConfiguration.getApiConfiguration(instanceUUID);
  
    // Prompt the user to enter the API key for the specified instance.
    const apiKey = await vscode.window.showInputBox({
      prompt: `Enter updated API key for ${apiConfig.instanceName} - ${apiConfig.apiUrl}`,
      ignoreFocusOut: true,
      password: true,
    }) || '';
  
    // Update the api instance configuration
    ApiConfiguration.setupApiConfiguration({
      instanceUUID: apiConfig.instanceUUID,
      instanceName: apiConfig.instanceName,
      apiUrl: apiConfig.apiUrl,
      apiModel: apiConfig.apiModel,
      apiKey: apiKey,
    });
  }
}
