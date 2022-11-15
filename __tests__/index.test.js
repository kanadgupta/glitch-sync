const nock = require('nock');

const run = require('../run');

describe('glitch-sync main runner tests', () => {
  let mockStdOut;

  const getCommandOutput = () => {
    return [mockStdOut.mock.calls.join('\n\n')].filter(Boolean).join('\n\n');
  };

  beforeEach(() => {
    mockStdOut = jest.spyOn(process.stdout, 'write').mockImplementation();

    process.env.GITHUB_REPOSITORY = 'owner/repo';
  });

  afterEach(() => {
    delete process.env.GITHUB_REPOSITORY;
    delete process.env['INPUT_AUTH-TOKEN'];
    delete process.env['INPUT_PROJECT-ID'];
    delete process.env.INPUT_PATH;

    mockStdOut.mockReset();

    nock.cleanAll();
  });

  it('should fail if missing project ID param', async () => {
    process.env['INPUT_AUTH-TOKEN'] = 'test-auth';

    const scope = nock('https://api.glitch.com').post('/project/githubImport').reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Input required and not supplied: project-id');
    // assertion that nock is not called
    expect(scope.isDone()).toBe(false);
  });

  it('should fail if missing auth param', async () => {
    process.env['INPUT_PROJECT-ID'] = 'test-project-id';

    const scope = nock('https://api.glitch.com').post('/project/githubImport').reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Input required and not supplied: auth-token');
    // assertion that nock is not called
    expect(scope.isDone()).toBe(false);
  });

  it('should fail if Glitch API fails with empty response body', async () => {
    process.env['INPUT_AUTH-TOKEN'] = 'test-auth';
    process.env['INPUT_PROJECT-ID'] = 'test-project-id';

    const scope = nock('https://api.glitch.com', { encodedQueryParams: true })
      .post('/project/githubImport')
      .query({ projectId: 'test-project-id', repo: 'owner/repo' })
      .reply(403);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: null');
    expect(scope.isDone()).toBe(true);
  });

  // TODO: is this even a response body that the Glitch API returns?
  // The error handling is a bit of a mess, that should be cleaned up at some point
  it('should fail if Glitch API fails with JSON response body', async () => {
    process.env['INPUT_AUTH-TOKEN'] = 'test-auth';
    process.env['INPUT_PROJECT-ID'] = 'test-project-id';

    const scope = nock('https://api.glitch.com', { encodedQueryParams: true })
      .post('/project/githubImport')
      .query({ projectId: 'test-project-id', repo: 'owner/repo' })
      .reply(400, { stderr: 'yikes' });

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: yikes');
    expect(scope.isDone()).toBe(true);
  });

  it('should run with required parameters', async () => {
    process.env['INPUT_AUTH-TOKEN'] = 'test-auth';
    process.env['INPUT_PROJECT-ID'] = 'test-project-id';

    const scope = nock('https://api.glitch.com', { encodedQueryParams: true })
      .post('/project/githubImport')
      .query({ projectId: 'test-project-id', repo: 'owner/repo' })
      .reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
    expect(scope.isDone()).toBe(true);
  });

  it('should run with optional path param', async () => {
    process.env['INPUT_AUTH-TOKEN'] = 'test-auth';
    process.env.INPUT_PATH = 'test-path';
    process.env['INPUT_PROJECT-ID'] = 'test-project-id';

    const scope = nock('https://api.glitch.com', { encodedQueryParams: true })
      .post('/project/githubImport')
      .query({ path: 'test-path', projectId: 'test-project-id', repo: 'owner/repo' })
      .reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
    expect(scope.isDone()).toBe(true);
  });
});
