import type { AgentIconAsset } from '@switch-console/core/agents/plugins';

export const icon: AgentIconAsset = {
  kind: 'svg',
  alt: 'Auggie',
  variants: [
    {
      minSize: 0,
      light: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 3 21h3.5l1.6-3.6h7.8l1.6 3.6H21L12 2Zm-2.4 12.2L12 8.7l2.4 5.5H9.6Z" fill="currentColor"/></svg>`,
    },
  ],
};
