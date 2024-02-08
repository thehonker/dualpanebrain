
'use strict';

/**
 * Import all members from the vscode module.
 */
import * as vscode from 'vscode';

/**
 * A secret namespace used by the API key storage functionality.
 */
const secretNamespace = 'dpb';

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
   * @param instanceName - The instance identifier for the API key.
   * @param token - The API key to be stored.
   * @returns A Promise that resolves when the API key has been successfully stored.
   */
  public async storeApiKey(instanceName: string, token: string): Promise<void> {
    // Update values in secret storage.
    const keyPath = `${secretNamespace}.apikey.${instanceName}`;
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
  public async getApiKey(instanceName: string): Promise<string | undefined> {
    /*
    Retrieve data from secret storage.
    */
    const keyPath = `${secretNamespace}.apikey.${instanceName}`;
    return await this.secretStorage.get(keyPath);
  }
}

/**
 * A helper function that prompts the user to enter an API key and stores it using the APIKeyStorage class.
 *
 * This function should be called within the context of a vscode extension.
 *
 * @param context - The vscode.ExtensionContext object containing information about the extension.
 * @returns A Promise that resolves when the API key has been successfully stored.
 */
export async function promptApiKey(context: vscode.ExtensionContext): Promise<void> {
  // Initialize the ApiKeyStorage instance using the vscode.ExtensionContext object.
  ApiKeyStorage.init(context);
  const apiKeyStorage = ApiKeyStorage.instance;

  // Prompt the user to enter an instance identifier for the API key.
  const instanceName = await vscode.window.showInputBox({
    prompt: 'Instance Identifier - One Word, [A-ZA-z0-9\\_\\-]',
    placeHolder: 'default',
    ignoreFocusOut: true,
    password: false
  }) || 'default';

  // Prompt the user to enter the API key for the specified instance.
  const tokenInput = await vscode.window.showInputBox({
    prompt: `Enter your api key for instance ${instanceName}`,
    placeHolder: 'areallycoolapikey',
    ignoreFocusOut: true,
    password: true,
  }) || '';

  // Store the API key using the ApiKeyStorage.storeApiKey method.
  await apiKeyStorage.storeApiKey(instanceName, tokenInput);

  return;
}
