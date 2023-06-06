# Glitch Sync From GitHub

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/kanadgupta/glitch-sync)

This action uses the [Glitch](https://glitch.com/) API to [export your GitHub repository to your Glitch project](https://glitch.happyfox.com/kb/article/20-importing-code-from-github/).

## Requirements

- A GitHub repository
- An existing [Glitch](https://glitch.com/) project

## Inputs

<img align="right" src="https://user-images.githubusercontent.com/8854718/77256998-982c4900-6c3f-11ea-9b50-c2d27d37f8cd.png" width="200">

### `auth-token`

**Required** The `Authorization` request header used when clicking the **Import from GitHub** button (Tools > Import and Export > Import from GitHub) from within your Glitch project (see screenshot to the right). The only way that I know to obtain this is to look at your Network tab in your browser and capture the contents of the `Authorization` request header when the `POST` request to https://api.glitch.com/project/githubImport is made.

### `project-id`

**Required** The ID of your Glitch Project. You can obtain this via one of two ways:

- Grabbing the value the `projectId` query parameter of the [aforementioned](#auth-token) `POST` request to https://api.glitch.com/project/githubImport
- Logging `process.env.PROJECT_ID` in your Glitch project. More info: https://glitch.happyfox.com/kb/article/30-variables/

### `path`

**Optional** A relative path to a specific folder to import. If not passed, it will import the entirety of the GitHub repository.

### `repo`

**Optional** The GitHub repository to sync, using the format `owner/repo` (e.g., `octocat/Hello-World`). If not passed, the current GitHub repository will be synced.

## Example usage

See [`.github/workflows/ci.yml`](https://github.com/kanadgupta/glitch-sync/blob/main/.github/workflows/ci.yml) for several full examples.

_I strongly recommend adding the inputs as encrypted secrets instead of passing them directly into your action file! [Here](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) are the GitHub docs on how to do this._

```yml
uses: kanadgupta/glitch-sync@main
with:
  auth-token: '${{ secrets.authToken }}'
  project-id: '${{ secrets.projectId }}'
  path: 'dist' # optional
```

## Disclaimer

I am not an employee of Glitch (merely a user)! This repository is not endorsed by Glitch and does not use a documented public API endpoint (and the endpoint can be kind of flaky to be honest). The endpoint may change at anytime and break this workflow.
