import { beforeEach, expect, it, vi } from 'vitest';
import { auggieAcp } from './auggie-acp';

const mocks = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock('../provider-process', () => ({ execProvider: mocks.exec }));

const input = {
  binaryPath: '/bin/auggie',
  cwd: '/work',
  env: { PATH: '/bin' },
  handshake: vi.fn(),
};
const session = {
  accessToken: 'fixture-only',
  tenantURL: 'https://tenant.example.com',
  scopes: ['email'],
};
const check = () => auggieAcp.checkSignIn!(input);

beforeEach(() => {
  vi.clearAllMocks();
});

it('starts ACP with the supplied environment and disables automatic updates', async () => {
  expect(await auggieAcp.launch(input)).toEqual({
    command: '/bin/auggie',
    args: ['--acp'],
    env: { PATH: '/bin', AUGMENT_DISABLE_AUTO_UPDATE: '1' },
  });
  expect(input.env).toEqual({ PATH: '/bin' });
});

it('reads the native token command without starting an ACP session or signing in', async () => {
  mocks.exec.mockResolvedValue({
    stdout: `Augment authentication session:\n\nSESSION=${JSON.stringify(session)}\n\nUsage for automation:\n`,
    stderr: '',
  });
  expect(await check()).toEqual({
    status: 'authenticated',
    message: 'Auggie has a configured authentication session.',
    models: [],
  });
  expect(mocks.exec).toHaveBeenCalledWith('/bin/auggie', ['token', 'print'], {
    cwd: '/work',
    env: { PATH: '/bin', AUGMENT_DISABLE_AUTO_UPDATE: '1' },
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
  });
  expect(input.handshake).not.toHaveBeenCalled();
});

it.each([
  '{}',
  'null',
  '[]',
  '{',
  JSON.stringify({ ...session, accessToken: '' }),
  JSON.stringify({ ...session, accessToken: '  ' }),
  JSON.stringify({ ...session, accessToken: true }),
  JSON.stringify({ ...session, tenantURL: 'not a URL' }),
  JSON.stringify({ ...session, tenantURL: 'file:///tmp/tenant' }),
  JSON.stringify({ ...session, tenantURL: 'javascript:tenant' }),
  JSON.stringify({ ...session, scopes: 'email' }),
  JSON.stringify({ ...session, scopes: [true] }),
])('does not report an invalid session as authenticated: %s', async (value) => {
  mocks.exec.mockResolvedValue({ stdout: `SESSION=${value}\n`, stderr: '' });
  expect((await check()).status).toBe('unknown');
});

it('recognizes the native signed-out failure even though initialize offers no auth methods', async () => {
  mocks.exec.mockRejectedValue({
    code: 1,
    stdout: '',
    stderr: 'You are not currently logged in to Augment.\nRun auggie login to authenticate first.',
  });
  expect(await check()).toMatchObject({
    status: 'unauthenticated',
    message: 'Sign in on the execution machine with auggie login.',
  });
  expect(input.handshake).not.toHaveBeenCalled();
});

it('reports an unexpected command failure without exposing its captured output', async () => {
  mocks.exec.mockRejectedValue({
    code: 1,
    stdout: JSON.stringify(session),
    stderr: `Unexpected failure: ${session.accessToken}`,
  });
  const result = await check();
  expect(result.status).toBe('unknown');
  expect(JSON.stringify(result)).not.toContain(session.accessToken);
  expect(JSON.stringify(result)).not.toContain(session.tenantURL);
});

it('reports a timed-out check as unknown rather than signed out', async () => {
  mocks.exec.mockRejectedValue({ code: 'ETIMEDOUT', killed: true });
  expect((await check()).status).toBe('unknown');
});
