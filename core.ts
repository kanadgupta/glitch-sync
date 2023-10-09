import os from 'node:os';

/**
 * This file is a lightweight re-implementation of the functions
 * in `@actions/core`.
 *
 * @see {@link https://github.com/actions/toolkit/tree/main/packages/core}
 * @see {@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions}
 */

/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  } else if (typeof input === 'string' || input instanceof String) {
    return input as string;
  }
  return JSON.stringify(input);
}

function escapeData(s: unknown): string {
  return toCommandValue(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::debug::This is the debug message
 *   ::error::This is the error message
 */
function issueCommand(command: 'debug' | 'error', message: unknown): void {
  const cmd = `::${command}::${escapeData(message)}`;
  process.stdout.write(cmd.toString() + os.EOL);
}

/**
 * Writes debug message to user log
 * @param message debug message
 */
export function debug(message: unknown) {
  issueCommand('debug', message);
}

/**
 * Gets the value of an input.
 * Returns an empty string if the value is not defined.
 *
 * @param name name of the input to get
 */
export function getInput(name: string, options: { required?: boolean } = {}) {
  const val: string = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
  if (options.required && !val) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return val.trim();
}

/**
 * Writes info to log with console.log.
 * @param message info message
 */
export function info(message: string): void {
  process.stdout.write(message + os.EOL);
}

/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
export function setFailed(message: string | Error): void {
  process.exitCode = 1;

  issueCommand('error', message instanceof Error ? message.toString() : message);
}
