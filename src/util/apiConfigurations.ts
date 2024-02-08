'use strict';

import * as crypto from 'node:crypto';

import * as vscode from 'vscode';

import OpenAI from 'openai';

import { ApiKeyStorage } from './apiKeyStorage';
import { Globals } from './globals';
import { parseBool } from './util';

const configNamespace = Globals.configNamespace;
const log = Globals.log;

export class ApiConfiguration {
  private static _apiKeyStorage: ApiKeyStorage;

  private static _apiConfigurations: Object = {};

  public static defaultApiInstance: string = '';

  public static async init(context: vscode.ExtensionContext): Promise<void> {
    log.debug('util/apiConfiguration:init() start');

    ApiConfiguration._apiKeyStorage = ApiKeyStorage.instance;

    log.debug('Loading api configurations object from settings.json');

    const apiConfigurationsString = await vscode.workspace.getConfiguration(configNamespace).get('apiConfigurations');
    const configuredApiConfigurations = JSON.parse(apiConfigurationsString as any);
    
    log.debug(JSON.stringify(configuredApiConfigurations, null, 2));

    const keys = Object.keys(configuredApiConfigurations);

    for (let i = 0; i < keys.length; i++) {
      const configuration = configuredApiConfigurations[keys[i]];
      const apiKey = await ApiConfiguration._apiKeyStorage.getApiKey(configuration.instanceUUID) || '';
      ApiConfiguration.setupApiConfiguration({
        instanceUUID: configuration.instanceUUID,
        instanceName: configuration.instanceName,
        apiUrl: configuration.apiUrl,
        apiModel: configuration.apiModel,
      });

      // Update the config list
      (ApiConfiguration._apiConfigurations as any)[configuration.instanceUUID] = {
        instanceUUID: configuration.instanceUUID,
        instanceName: configuration.instanceName,
        apiUrl: configuration.apiUrl,
        apiModel: configuration.apiModel,
      };

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
    log.debug(JSON.stringify(options, null, 2));

    if (!options.instanceUUID) {
      log.debug('util/apiConfiguration:setupApiConfiguration() called without options.instanceUUID');
      return;
    }
    // Fetch the existing config if any
    const existingApiConfigurationString = await 
      vscode.workspace
        .getConfiguration(`${configNamespace}.apiConfigurations`)
        .get(options.instanceUUID)
        || null;

    var existingApiConfiguration = null;
    if (existingApiConfigurationString !== null) {
      existingApiConfiguration = JSON.parse(existingApiConfigurationString as string);
    }

    if (options.apiKey.length !== 0) {
      // Store the api key
      await ApiConfiguration._apiKeyStorage.storeApiKey(
        options.instanceUUID,
        options.apiKey as string
      );
    }

    // Fetch the api key back
    const apiKey = await ApiConfiguration._apiKeyStorage.getApiKey(options.instanceUUID) || '';

    // Setup the openai library
    const openai = new OpenAI({
      baseURL: options.apiUrl || existingApiConfiguration.apiUrl,
      apiKey: apiKey,
    });

    // Store the rest of the configuration
    await vscode.workspace
      .getConfiguration(`${configNamespace}.apiConfigurations`)
      .update(
        `${options.instanceUUID}`,
        JSON.stringify({
          instanceUUID: options.instanceUUID,
          instanceName: options.instanceName || existingApiConfiguration.instanceName,
          apiUrl: options.apiUrl || existingApiConfiguration.apiUrl,
          apiModel: options.apiModel || existingApiConfiguration.apiModel,
        })
      );

    // Update the config list
    (ApiConfiguration._apiConfigurations as any)[options.instanceUUID].instanceUUID = options.instanceUUID;
    (ApiConfiguration._apiConfigurations as any)[options.instanceUUID].instanceName = options.instanceName;
    (ApiConfiguration._apiConfigurations as any)[options.instanceUUID].apiUrl = options.apiUrl;
    (ApiConfiguration._apiConfigurations as any)[options.instanceUUID].apiModel = options.apiModel;
    (ApiConfiguration._apiConfigurations as any)[options.instanceUUID].instanceUUID = options.instanceUUID;
    (ApiConfiguration._apiConfigurations as any)[options.instanceUUID].openai = openai;
  }

  /**
   * Get api configuration
   * @param instanceUUID - the instance uuid to get configuration for
   */
  public static async getApiConfiguration(instanceUUID: string): Promise<Object> {
    log.debug('util/apiConfiguration:getApiConfiguration() start');

    const apiConfigurationString = await 
      vscode.workspace
        .getConfiguration(`${configNamespace}.apiConfigurations`)
        .get(instanceUUID)
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

  public static async getApiUrl(instanceUUID: string): Promise<string> {
    log.debug('util/apiConfiguration:getApiUrl() start');
    const apiConfigurationString = await 
    vscode.workspace
      .getConfiguration(`${configNamespace}.apiConfigurations`)
      .get(instanceUUID)
      || null;

    var apiConfiguration = null;
    if (apiConfigurationString !== null) {
      apiConfiguration = JSON.parse(apiConfigurationString as string);
    }

    return apiConfiguration.apiUrl;
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
