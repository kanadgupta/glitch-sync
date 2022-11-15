const core = require('@actions/core');
const bent = require('bent');

async function run() {
  try {
    const params = new URLSearchParams({
      projectId: core.getInput('project-id', { required: true }),
      // https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
      repo: core.getInput('repo') || process.env.GITHUB_REPOSITORY,
    });
    const path = core.getInput('path');
    if (path) params.set('path', path);
    const url = `https://api.glitch.com/project/githubImport?${params.toString()}`;
    core.debug(`full URL: ${url}`);
    core.info('Syncing repo to Glitch 📡');
    const post = bent(url, 'POST', { authorization: core.getInput('auth-token', { required: true }) });
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
