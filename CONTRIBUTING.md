# Contributing

This project uses [`@vercel/ncc`](https://github.com/vercel/ncc) to compile the code and modules for usage in the GitHub Marketplace. [Here are GitHub's docs on the topic.](https://docs.github.com/en/free-pro-team@latest/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github)

When making changes to [`index.js`](https://github.com/kanadgupta/glitch-sync/blob/main/index.js) or any of the project dependencies, you'll need to update the distribution file in [`dist/index.js`](https://github.com/kanadgupta/glitch-sync/blob/main/dist/index.js). You can do this by running the following:
```sh
npm run build
```
