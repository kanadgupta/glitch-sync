const bent = require('bent');
const core = require('@actions/core');
const github = require('@actions/github');
const querystring = require('querystring');

async function run() {
  try {
    const projectId = core.getInput('project-id');
    const authorization = core.getInput('auth-token');
    if (!projectId || !authorization) {
      core.setFailed(
        'Oops! Project ID and Auth Token are required. See https://github.com/kanadgupta/glitch-sync#inputs for details.'
      );
      return;
    }
    const { owner, repo } = github.context.repo;
    const repoQs = querystring.stringify({ projectId, repo: `${owner}/${repo}` });
    const url = `https://api.glitch.com/project/githubImport?${repoQs}`;
    const post = bent(url, 'POST', { authorization });
    const resp = await post();
    if (resp.statusCode === 200) {
      core.setOutput('response', resp.statusMessage);
    } else {
      core.setFailed(resp.statusMessage);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
