import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import run from '../run';

const glitchUrl = 'https://api.glitch.com/project/githubImport';

const authorization = 'test-auth';
const projectId = 'test-project-id';
const repo = 'owner/repo';
// optional param
const path = 'test-path';

/** Validates the query and header params of the Glitch API request */
function validateReq(req, opts = {}) {
  if (req.headers.get('authorization') !== authorization) {
    throw new Error(`Mock error: expected ${authorization}, received ${req.headers.get('authorization')}`);
  }
  if (req.url.searchParams.get('projectId') !== projectId) {
    throw new Error(`Mock error: expected ${projectId}, received ${req.url.searchParams.get('projectId')}`);
  }

  const currentPath = opts.path || null;
  if (req.url.searchParams.get('path') !== currentPath) {
    throw new Error(`Mock error: expected ${currentPath}, received ${req.url.searchParams.get('path')}`);
  }

  const currentRepo = opts.repo || repo;
  if (req.url.searchParams.get('repo') !== currentRepo) {
    throw new Error(`Mock error: expected ${currentRepo}, received ${req.url.searchParams.get('repo')}`);
  }
}

const server = setupServer(
  // Describe the requests to mock.
  rest.post(glitchUrl, (req, res, ctx) => {
    validateReq(req);
    return res(ctx.status(200));
  }),
);

describe('glitch-sync main runner tests', () => {
  let mockStdOut;

  const getCommandOutput = () => {
    return [mockStdOut.mock.calls.join('\n\n')].filter(Boolean).join('\n\n');
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  beforeEach(() => {
    mockStdOut = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
    vi.stubEnv('GITHUB_REPOSITORY', repo);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    mockStdOut.mockReset();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('should fail if missing project ID param', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Input required and not supplied: project-id');
  });

  it('should fail if missing auth param', async () => {
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Input required and not supplied: auth-token');
  });

  it('should fail if Glitch API fails with empty response body', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req);
        return res(ctx.status(403));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Forbidden');
  });

  it('should fail if Glitch API fails with non-JSON response', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req);
        return res(ctx.status(403, '<html></html>'));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: <html></html>');
  });

  // TODO: is this even a response body that the Glitch API returns?
  // The error handling is a bit of a mess, that should be cleaned up at some point
  it('should fail if Glitch API fails with JSON response body', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req);
        return res(ctx.status(400), ctx.json({ stderr: 'yikes' }));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: yikes');
  });

  it('should run with required parameters', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
  });

  it('should run with optional path param', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', path);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req, { path });
        return res(ctx.status(200));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
  });

  it('should run with optional repo param', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', path);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);
    vi.stubEnv('INPUT_REPO', 'octocat/Hello-World');

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req, { path, repo: 'octocat/Hello-World' });
        return res(ctx.status(200));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
  });
});
