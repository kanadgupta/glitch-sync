import type { DefaultBodyType, PathParams, RestRequest } from 'msw';
import type { SpyInstance } from 'vitest';

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
function validateReq(
  req: RestRequest<DefaultBodyType, PathParams<string>>,
  opts: { path?: string; repo?: string } = {},
) {
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
  let mockStdOut: SpyInstance;

  const getCommandOutput = () => {
    return [mockStdOut.mock.calls.join('\n\n')].filter(Boolean).join('\n\n');
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  beforeEach(() => {
    mockStdOut = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
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
    expect(output).toContain('::error::Error running workflow: Input required and not supplied: project-id');
  });

  it('should fail if missing auth param', async () => {
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error running workflow: Input required and not supplied: auth-token');
  });

  it('should fail if github env variables are missing', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);
    vi.stubEnv('GITHUB_REPOSITORY', '');

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain(
      '::error::Error running workflow: Unable to detect critical GitHub Actions environment variables. Are you running this in a GitHub Action?',
    );
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

  it('should fail and display status text if Glitch API responds with non-JSON response', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req);
        return res(ctx.status(403), ctx.text('<html></html>'));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();

    expect(output).toContain('::debug::Raw 403 error response from Glitch: <html></html>');
    expect(output).toContain('::error::Error syncing to Glitch: Forbidden');
  });

  it('should fail and display status text if Glitch API responds with non-JSON response and custom status text', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req);
        return res(ctx.status(403, 'custom status text'), ctx.text('<html></html>'));
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();

    expect(output).toContain('::debug::Raw 403 error response from Glitch: <html></html>');
    expect(output).toContain('::error::Error syncing to Glitch: custom status text');
  });

  it('should fail if Glitch API fails with JSON response body', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', 'non-existent-path');
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      rest.post(glitchUrl, (req, res, ctx) => {
        validateReq(req, { path: 'non-existent-path' });
        return res(
          ctx.status(400),
          // Note: this is an example response for when a bad `path` query parameter is sent
          ctx.json({
            cmd: "/opt/watcher/scripts/github-import.sh --repository='kanadgupta/glitch-sync' --sub-directory='non-existent-path' --token='redacted'",
            code: 1,
            killed: false,
            signal: null,
            stderr: "mv: cannot stat '/tmp/tmp.pDQPiXJ6CU/non-existent-path/*': No such file or directory\n",
            stdout: 'Will checkout kanadgupta/glitch-sync at /tmp/tmp.pDQPiXJ6CU\n/app\n',
            task: 'Import from GitHub',
          }),
        );
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain(
      "::error::Error syncing to Glitch: mv: cannot stat '/tmp/tmp.pDQPiXJ6CU/non-existent-path/*': No such file or directory",
    );
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
