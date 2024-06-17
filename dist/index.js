import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ // The require scope
/******/ var __nccwpck_require__ = {};
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/compat get default export */
/******/ (() => {
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__nccwpck_require__.n = (module) => {
/******/ 		var getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__nccwpck_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__nccwpck_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "node:os"
const external_node_os_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:os");
var external_node_os_default = /*#__PURE__*/__nccwpck_require__.n(external_node_os_namespaceObject);
;// CONCATENATED MODULE: ./core.ts

/**
 * This file is a lightweight re-implementation of the functions
 * in `@actions/core`.
 *
 * @see {@link https://github.com/actions/toolkit/tree/main/packages/core}
 * @see {@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions}
 */
// ignoring this file since it's mainly all `@actions/core`
/* v8 ignore start */
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input) {
    if (input === null || input === undefined) {
        return '';
    }
    else if (typeof input === 'string' || input instanceof String) {
        return input;
    }
    return JSON.stringify(input);
}
function escapeData(s) {
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
function issueCommand(command, message) {
    const cmd = `::${command}::${escapeData(message)}`;
    process.stdout.write(cmd.toString() + (external_node_os_default()).EOL);
}
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    issueCommand('debug', message);
}
/**
 * Gets the value of an input.
 * Returns an empty string if the value is not defined.
 *
 * @param name name of the input to get
 */
function getInput(name, options = {}) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    return val.trim();
}
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + (external_node_os_default()).EOL);
}
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = 1;
    issueCommand('error', message instanceof Error ? message.toString() : message);
}

;// CONCATENATED MODULE: ./run.ts

async function run() {
    try {
        const projectId = getInput('project-id', { required: true });
        const authorization = getInput('auth-token', { required: true });
        const path = getInput('path');
        // https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
        const repo = getInput('repo') || process.env.GITHUB_REPOSITORY;
        if (!repo) {
            throw new Error('Unable to detect `GITHUB_REPOSITORY` environment variable. Are you running this in a GitHub Action?');
        }
        const query = new URLSearchParams({ projectId, repo });
        if (path)
            query.set('path', path);
        const url = `https://api.glitch.com/project/githubImport?${query.toString()}`;
        debug(`full URL: ${url}`);
        info('Syncing repo to Glitch 📡');
        const res = await fetch(url, { method: 'POST', headers: { authorization } });
        if (res.ok)
            return info('Glitch project successfully updated! 🎉');
        // handle error response from Glitch API
        let failureMessage = res.statusText;
        const text = await res.text();
        debug(`Raw ${res.status} error response from Glitch: ${text}`);
        try {
            // Occasionally Glitch will respond with JSON that contains a semi-helpful error
            const { stderr } = JSON.parse(text);
            if (stderr)
                failureMessage = stderr;
        }
        catch (e) { } // eslint-disable-line no-empty
        return setFailed(`Error syncing to Glitch: ${failureMessage}`);
    }
    catch (error) {
        debug(`Raw error: ${error}`);
        return setFailed(`Error running workflow: ${error.message}`);
    }
}

;// CONCATENATED MODULE: ./index.ts
/* v8 ignore start */

run();

