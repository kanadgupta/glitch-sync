import * as core from './core.js';

export default async function run() {
  try {
    const projectId = core.getInput('project-id', { required: true });
    const authorization = core.getInput('auth-token', { required: true });
    const path = core.getInput('path');
    // https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
    const repo = core.getInput('repo') || process.env.GITHUB_REPOSITORY;
    if (!repo) {
      throw new Error(
        'Unable to detect `GITHUB_REPOSITORY` environment variable. Are you running this in a GitHub Action?',
      );
    }
    const query = new URLSearchParams({ projectId, repo });
    if (path) query.set('path', path);
    const url = `https://api.glitch.com/project/githubImport?${query.toString()}`;
    core.debug(`full URL: ${url}`);
    core.info('Syncing repo to Glitch 📡');
    const res = await fetch(url, { method: 'POST', headers: { authorization } });
    if (res.ok) return core.info('Glitch project successfully updated! 🎉');

    // handle error response from Glitch API
    let failureMessage = res.statusText;
    const text = await res.text();
    core.debug(`Raw ${res.status} error response from Glitch: ${text}`);
    try {
      // Occasionally Glitch will respond with JSON that contains a semi-helpful error
      const { stderr } = JSON.parse(text);
      if (stderr) failureMessage = stderr;
    } catch (e) {} // eslint-disable-line no-empty

    return core.setFailed(`Error syncing to Glitch: ${failureMessage}`);
  } catch (error) {
    core.debug(`Raw error: ${error}`);
    return core.setFailed(`Error running workflow: ${error.message}`);
  }
}
