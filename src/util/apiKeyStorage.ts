'use strict';

/**
 * Import all members from the vscode module.
 */
import * as vscode from 'vscode';

import { Globals } from './globals';

/**
 * A secret namespace used by the API key storage functionality.
 */
const secretNamespace = Globals.configNamespace;
const log = Globals.log;

/**
 * API key storage class.
 */
export class ApiKeyStorage {
  // An API key storage instance.
  private static _instance: ApiKeyStorage;

  /**
   * Constructs an instance of ApiKeyStorage with a reference to the vscode.SecretStorage object.
   *
   * @param secretStorage - The vscode.SecretStorage object used to store and retrieve secrets.
   */
  constructor(private secretStorage: vscode.SecretStorage) {}

  /**
   * A static method that initializes the API key storage.
   *
   * This method should only be called once, during the initialization phase of the extension.
   *
   * @param context - The vscode.ExtensionContext object containing information about the extension.
   */
  static init(context: vscode.ExtensionContext): void {
    log.debug('util/apiKeyStorage:init() start');
    // Create instance of new ApiKeyStorage.
    ApiKeyStorage._instance = new ApiKeyStorage(context.secrets);
  }

  /**
   * A getter that returns the API key storage instance.
   */
  static get instance(): ApiKeyStorage {
    // Getter of our ApiKeyStorage existing instance.
    return ApiKeyStorage._instance;
  }

  /**
   * A public method that asynchronously stores an API key in the secret storage using the given instance name and token.
   *
   * @param instanceUUID - The instance identifier for the API key.
   * @param token - The API key to be stored.
   * @returns A Promise that resolves when the API key has been successfully stored.
   */
  public async storeApiKey(instanceUUID: string, token: string): Promise<void> {
    log.debug('util/apiKeyStorage:storeApiKey() start');
    log.debug(`Storing api key for ${instanceUUID}`);
    // Update values in secret storage.
    const keyPath = `${secretNamespace}.apikey.${instanceUUID}`;
    if (token) {
      this.secretStorage.store(keyPath, token);
    }
  }

  /**
   * A public method that asynchronously retrieves an API key from the secret storage using the given instance name.
   *
   * @param instanceName - The instance identifier for the API key.
   * @returns A Promise that resolves with the API key or undefined if the key is not found.
   */
  public async getApiKey(instanceUUID: string): Promise<string | undefined> {
    log.debug('util/apiKeyStorage:getApiKey() start');
    log.debug(`Fetching api key for ${instanceUUID}`);
    /*
    Retrieve data from secret storage.
    */
    const keyPath = `${secretNamespace}.apikey.${instanceUUID}`;
    return await this.secretStorage.get(keyPath);
  }
}
