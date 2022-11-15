const core = require('@actions/core');
const github = require('@actions/github');
const bent = require('bent');

async function run() {
  try {
    const projectId = core.getInput('project-id', { required: true });
    const authorization = core.getInput('auth-token', { required: true });
    const path = core.getInput('path');
    const { owner, repo } = github.context.repo;
    const query = new URLSearchParams({ projectId, repo: `${owner}/${repo}` });
    if (path) query.set('path', path);
    const url = `https://api.glitch.com/project/githubImport?${query.toString()}`;
    core.debug(`full URL: ${url}`);
    core.info('Syncing repo to Glitch 📡');
    const post = bent(url, 'POST', { authorization });
    await post();
    return core.info('Glitch project successfully updated! 🎉');
  } catch (error) {
    let failureMessage = error.message;
    core.debug(`Raw error: ${error}`);
    if (error.responseBody) {
      // If error hitting Glitch API, send raw error response body to debug logs
      // Docs: https://github.com/actions/toolkit/blob/main/docs/action-debugging.md#step-debug-logs
      const details = (await error.responseBody).toString();
      core.debug(`Raw error response from Glitch: ${details}`);
      try {
        failureMessage = JSON.parse(details).stderr;
      } catch (e) {} // eslint-disable-line no-empty
    }
    return core.setFailed(`Error syncing to Glitch: ${failureMessage}`);
  }
}

module.exports = run;
