import type { DefaultBodyType, StrictRequest } from 'msw';
import type { MockInstance } from 'vitest';

import { http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import run from '../run.js';

const glitchUrl = 'https://api.glitch.com/project/githubImport';

const authorization = 'test-auth';
const projectId = 'test-project-id';
const repo = 'owner/repo';
// optional param
const path = 'test-path';

/** Validates the query and header params of the Glitch API request */
function validateReq(req: StrictRequest<DefaultBodyType>, opts: { path?: string; repo?: string } = {}) {
  if (req.headers.get('authorization') !== authorization) {
    throw new Error(`Mock error: expected ${authorization}, received ${req.headers.get('authorization')}`);
  }
  const { searchParams } = new URL(req.url);
  if (searchParams.get('projectId') !== projectId) {
    throw new Error(`Mock error: expected ${projectId}, received ${searchParams.get('projectId')}`);
  }

  const currentPath = opts.path || null;
  if (searchParams.get('path') !== currentPath) {
    throw new Error(`Mock error: expected ${currentPath}, received ${searchParams.get('path')}`);
  }

  const currentRepo = opts.repo || repo;
  if (searchParams.get('repo') !== currentRepo) {
    throw new Error(`Mock error: expected ${currentRepo}, received ${searchParams.get('repo')}`);
  }
}

const server = setupServer(
  // Describe the requests to mock.
  http.post(glitchUrl, ({ request }) => {
    validateReq(request);
    return new Response(null, { status: 200 });
  }),
);

describe('glitch-sync main runner tests', () => {
  let mockStdOut: MockInstance;

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
    expect(output).toMatch(/\n::error::Error running workflow: Input required and not supplied: project-id\n/);
  });

  it('should fail if missing auth param', async () => {
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(/\n::error::Error running workflow: Input required and not supplied: auth-token\n/);
  });

  it('should fail if github env variables are missing', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);
    vi.stubEnv('GITHUB_REPOSITORY', '');

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(
      /\n::error::Error running workflow: Unable to detect `GITHUB_REPOSITORY` environment variable. Are you running this in a GitHub Action\?\n/,
    );
  });

  it('should fail if Glitch API fails with empty response body', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request);
        return new Response(null, { status: 403, statusText: 'Forbidden' });
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(/\n::error::Error syncing to Glitch: Forbidden\n/);
  });

  it('should fail and display status text if Glitch API responds with non-JSON response', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request);
        return new Response('<html></html>', { status: 403, statusText: 'Forbidden' });
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();

    expect(output).toMatch(/\n::debug::Raw 403 error response from Glitch: <html><\/html>\n/);
    expect(output).toMatch(/\n::error::Error syncing to Glitch: Forbidden\n/);
  });

  it('should fail and display status text if Glitch API responds with non-JSON response and custom status text', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request);
        return new Response('<html></html>', { status: 403, statusText: 'custom status text' });
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();

    expect(output).toMatch(/\n::debug::Raw 403 error response from Glitch: <html><\/html>\n/);
    expect(output).toMatch(/\n::error::Error syncing to Glitch: custom status text\n/);
  });

  it('should fail if Glitch API fails with JSON response body', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', 'non-existent-path');
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request, { path: 'non-existent-path' });
        // Note: this is an example response for when a bad `path` query parameter is sent
        return new Response(
          JSON.stringify({
            cmd: "/opt/watcher/scripts/github-import.sh --repository='kanadgupta/glitch-sync' --sub-directory='non-existent-path' --token='redacted'",
            code: 1,
            killed: false,
            signal: null,
            stderr: "mv: cannot stat '/tmp/tmp.pDQPiXJ6CU/non-existent-path/*': No such file or directory\n",
            stdout: 'Will checkout kanadgupta/glitch-sync at /tmp/tmp.pDQPiXJ6CU\n/app\n',
            task: 'Import from GitHub',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(
      /\n::error::Error syncing to Glitch: mv: cannot stat '\/tmp\/tmp.pDQPiXJ6CU\/non-existent-path\/\*': No such file or directory%0A\n/,
    );
  });

  it('should fail and handle unexpected JSON response bodies', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', 'non-existent-path');
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request, { path: 'non-existent-path' });
        return new Response(
          JSON.stringify({
            something: 'weird',
          }),
          { status: 400, statusText: 'Bad Request' },
        );
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(/\n::debug::Raw 400 error response from Glitch: {"something":"weird"}\n/);
    expect(output).toMatch(/\n::error::Error syncing to Glitch: Bad Request\n/);
  });

  it('should run with required parameters', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(/\nGlitch project successfully updated! 🎉\n/);
  });

  it('should run with optional path param', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', path);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request, { path });
        return new Response(null, { status: 200 });
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(/\nGlitch project successfully updated! 🎉\n/);
  });

  it('should run with optional repo param', async () => {
    vi.stubEnv('INPUT_AUTH-TOKEN', authorization);
    vi.stubEnv('INPUT_PATH', path);
    vi.stubEnv('INPUT_PROJECT-ID', projectId);
    vi.stubEnv('INPUT_REPO', 'octocat/Hello-World');

    server.use(
      http.post(glitchUrl, ({ request }) => {
        validateReq(request, { path, repo: 'octocat/Hello-World' });
        return new Response(null, { status: 200 });
      }),
    );

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toMatch(/\nGlitch project successfully updated! 🎉\n/);
  });
});
