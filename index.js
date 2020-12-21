const bent = require('bent');
const core = require('@actions/core');
const github = require('@actions/github');
const querystring = require('querystring');

async function run() {
  try {
    const projectId = core.getInput('project-id');
    const authorization = core.getInput('auth-token');
    const path = core.getInput('path');
    if (!projectId || !authorization) {
      return core.setFailed(
        'Oops! Project ID and Auth Token are required. See https://github.com/kanadgupta/glitch-sync#inputs for details.'
      );
    }
    const { owner, repo } = github.context.repo;
    const query = { projectId, repo: `${owner}/${repo}` };
    if (path) query.path = path;
    const repoQs = querystring.stringify(query);
    core.info('Syncing repo to Glitch 📡');
    core.debug(`query string: ${repoQs}`);
    const url = `https://api.glitch.com/project/githubImport?${repoQs}`;
    const post = bent(url, 'POST', { authorization });
    await post();
    return core.info('Glitch project successfully updated! 🎉');
  } catch (error) {
    let failureMessage = error.message;
    core.debug(`Raw error object: ${error}`);
    if (error.responseBody) {
      // If error hitting Glitch API, send raw error response body to debug logs
      // Docs: https://github.com/actions/toolkit/blob/main/docs/action-debugging.md#step-debug-logs
      const details = (await error.responseBody).toString();
      failureMessage = JSON.parse(details).stderr;
      core.debug(`Raw error response from Glitch: ${details}`);
    }
    return core.setFailed(`Error syncing to Glitch: ${failureMessage}`);
  }
}

run();
