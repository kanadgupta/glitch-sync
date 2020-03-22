# Glitch Sync From GitHub

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/kanadgupta/glitch-sync)

This action uses the [Glitch](https://glitch.com/) API to [export your GitHub repository to your Glitch project](https://glitch.com/help/import-git/).

## Requirements

- A public GitHub repository
- An existing [Glitch](https://glitch.com/) project

## Inputs

### `project-id`

**Required** The ID of your Glitch Project. You can easily obtain this by logging `process.env.PROJECT_ID` in your Glitch project. More info: https://glitch.com/help/project/

### `auth-token`

**Required** The `authorization` request header used when clicking the **Import from GitHub** button (Tools > Import and Export > Import from GitHub) from within your Glitch project (see screenshot below). The only way that I know to obtain this is to look at your Network tab in your browser and capture the contents of the `authorization` request header when the request to https://api.glitch.com/project/githubImport is made.

<img src="https://user-images.githubusercontent.com/8854718/77256998-982c4900-6c3f-11ea-9b50-c2d27d37f8cd.png" width="200">

## Example usage

*I strongly recommend adding the inputs as encrypted secrets instead of passing them directly into your action file! [Here](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets#creating-encrypted-secrets) are the GitHub docs on how to do this.*

```
uses: kanadgupta/glitch-sync
with:
  project-id: '${{ secrets.projectId }}'
  auth-token: '${{ secrets.authToken }}'
```

## Disclaimer

I am not an employee of Glitch (just an enthusiastic user)! This repository is not endorsed by Glitch and does not use a documented public API endpoint (and the endpoint can be kind of flaky to be honest). The endpoint may change at anytime and break this workflow.
