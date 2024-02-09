'use strict';

import * as vscode from 'vscode';

import { Globals } from './globals';

const log = Globals.log;

export function parseBool(str: string): boolean {
  log.debug('util/parseBool:init() start');
  const validStrings = ["true","t","yes","y","on","1"]; // These strings are equivalent to boolean values of `true`.
  const invalidStrings = ["false", "f", "no", "n", "off", "0", ""]; // These strings represent a false value.
  let result;
  if (validStrings.includes(str.toLowerCase())) {
    return true; // If the string is found in valid strings, it will be considered as `true`.
  } else if (invalidStrings.includes(str.toLowerCase())) {
    return false; // Otherwise, if it's found in invalid strings array, it would be considered as a `false` value.
  } else {
    result = /^\d+$/.test(str); // If the string is not matching any valid or invalid keywords above, we will check whether its number using regular expressions to match only numbers and return false if so.
    return !result; // Finally it returns true/false based on the matched value in regexp test method.
  }
}
