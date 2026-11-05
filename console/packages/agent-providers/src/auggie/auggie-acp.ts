import { z } from 'zod';
import { createAcpAdapter, type AcpAdapter } from '../acp/acp-adapter';
import type { AcpAdapterOptions, AcpProviderHooks } from '../acp/hooks';
import { execProvider } from '../provider-process';
import { readiness, signInWith } from '../readiness';

const AUGGIE_LOGIN = 'auggie login';
const sessionSchema = z.object({
  accessToken: z.string().trim().min(1),
  tenantURL: z.url({ protocol: /^https?$/ }),
  scopes: z.array(z.string()),
});

function hasSession(output: string): boolean {
  const session = output.match(/^SESSION=(.+)$/m)?.[1];
  if (!session) return false;
  try {
    return sessionSchema.safeParse(JSON.parse(session)).success;
  } catch {
    return false;
  }
}

export const auggieAcp: AcpProviderHooks = {
  provider: 'auggie',
  label: 'Auggie',
  defaultBinary: 'auggie',
  capabilities: {
    modelSwitchInSession: true,
    steering: false,
    resume: true,
    approvals: true,
    userInput: false,
  },
  launch: ({ binaryPath, env }) => ({
    command: binaryPath,
    args: ['--acp'],
    env: { ...env, AUGMENT_DISABLE_AUTO_UPDATE: '1' },
  }),
  loginCommand: AUGGIE_LOGIN,
  inheritEnv: ['AUGMENT_SESSION_AUTH'],
  // Auggie 0.37.0's initialize response has no auth methods even when signed
  // out. The token command uses the CLI's own credential precedence without
  // starting a conversation. Its credential-bearing output stays local.
  checkSignIn: async ({ binaryPath, cwd, env }) => {
    const unknown = () =>
      readiness('unknown', 'Could not read Auggie sign-in status. Check its CLI configuration.');
    try {
      const { stdout } = await execProvider(binaryPath, ['token', 'print'], {
        cwd,
        env: { ...env, AUGMENT_DISABLE_AUTO_UPDATE: '1' },
        timeout: 20_000,
        maxBuffer: 1024 * 1024,
      });
      return hasSession(stdout)
        ? readiness('authenticated', 'Auggie has a configured authentication session.')
        : unknown();
    } catch (error) {
      const failure = error as { code?: unknown; stderr?: unknown };
      if (
        failure?.code === 1 &&
        typeof failure.stderr === 'string' &&
        /not currently logged in to Augment|No active session found/.test(failure.stderr)
      )
        return readiness('unauthenticated', signInWith(AUGGIE_LOGIN));
      // execFile errors include stdout and stderr, which may contain the token.
      return unknown();
    }
  },
  // `default` and `ask` describe workflows, not permission levels.
  sessionMode: () => 'default',
};

export function createAuggieAdapter(options: AcpAdapterOptions = {}): AcpAdapter {
  return createAcpAdapter(auggieAcp, options);
}
