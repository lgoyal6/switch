import { definePlugin, registerPluginBehavior } from '@switch-console/core/agents/plugins';
import { npmDependency } from '@switch-console/core/agents/plugins/helpers';
import { icon } from './icon';

export const plugin = definePlugin(
  {
    id: 'auggie',
    name: 'Auggie',
    description: 'Auggie ACP with persistent conversations, approvals and model switching.',
    websiteUrl: 'https://www.augmentcode.com/auggie',
    cliLabel: 'Auggie',
    sessionStartMaySignIn: true,
  },
  {
    autoApprove: { kind: 'supported' },
    effort: { kind: 'none' },
    hostDependency: npmDependency({
      id: 'auggie',
      package: '@augmentcode/auggie',
      binaryNames: ['auggie'],
      installDocs: 'https://docs.augmentcode.com/cli/quickstart',
    }),
    mcp: { kind: 'none' },
    models: { kind: 'none' },
    plugins: { kind: 'none' },
    prompt: { kind: 'none' },
    sessions: { kind: 'resumable' },
    repoAgents: { kind: 'none' },
  },
  { icon }
);

export const provider = registerPluginBehavior(plugin, {
  prompt: {
    buildCommand: () => {
      throw new Error('Auggie runs through the ACP session host.');
    },
  },
});
