const nock = require('nock');

const run = require('../run');

const authorization = 'test-auth';
const projectId = 'test-project-id';
const repo = 'owner/repo';
// optional param
const path = 'test-path';

const glitchNock = () =>
  nock('https://api.glitch.com', { encodedQueryParams: true, reqheaders: { authorization } }).post(
    '/project/githubImport'
  );

describe('glitch-sync main runner tests', () => {
  let mockStdOut;

  const getCommandOutput = () => {
    return [mockStdOut.mock.calls.join('\n\n')].filter(Boolean).join('\n\n');
  };

  beforeEach(() => {
    mockStdOut = jest.spyOn(process.stdout, 'write').mockImplementation();

    process.env.GITHUB_REPOSITORY = repo;
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
    process.env['INPUT_AUTH-TOKEN'] = authorization;

    const scope = glitchNock().reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Input required and not supplied: project-id');
    // assertion that nock is not called
    expect(scope.isDone()).toBe(false);
  });

  it('should fail if missing auth param', async () => {
    process.env['INPUT_PROJECT-ID'] = projectId;

    const scope = glitchNock().reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: Input required and not supplied: auth-token');
    // assertion that nock is not called
    expect(scope.isDone()).toBe(false);
  });

  it('should fail if Glitch API fails with empty response body', async () => {
    process.env['INPUT_AUTH-TOKEN'] = authorization;
    process.env['INPUT_PROJECT-ID'] = projectId;

    const scope = glitchNock().query({ projectId, repo }).reply(403);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: null');
    scope.done();
  });

  // TODO: is this even a response body that the Glitch API returns?
  // The error handling is a bit of a mess, that should be cleaned up at some point
  it('should fail if Glitch API fails with JSON response body', async () => {
    process.env['INPUT_AUTH-TOKEN'] = authorization;
    process.env['INPUT_PROJECT-ID'] = projectId;

    const scope = glitchNock().query({ projectId, repo }).reply(400, { stderr: 'yikes' });

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('::error::Error syncing to Glitch: yikes');
    scope.done();
  });

  it('should run with required parameters', async () => {
    process.env['INPUT_AUTH-TOKEN'] = authorization;
    process.env['INPUT_PROJECT-ID'] = projectId;

    const scope = glitchNock().query({ projectId, repo }).reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
    scope.done();
  });

  it('should run with optional path param', async () => {
    process.env['INPUT_AUTH-TOKEN'] = authorization;
    process.env.INPUT_PATH = path;
    process.env['INPUT_PROJECT-ID'] = projectId;

    const scope = glitchNock().query({ path, projectId, repo }).reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
    scope.done();
  });

  it('should run with optional repo param', async () => {
    process.env['INPUT_AUTH-TOKEN'] = authorization;
    process.env.INPUT_PATH = path;
    process.env['INPUT_PROJECT-ID'] = projectId;
    process.env.INPUT_REPO = 'octocat/Hello-World';

    const scope = glitchNock().query({ path, projectId, repo: 'octocat/Hello-World' }).reply(200);

    await expect(run()).resolves.toBeUndefined();

    const output = getCommandOutput();
    expect(output).toContain('Glitch project successfully updated! 🎉');
    scope.done();
  });
});
