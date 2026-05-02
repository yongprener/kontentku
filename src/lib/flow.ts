export const workflowRoutePaths = {
  dashboard: '/',
  scrape: '/scrape',
  review: '/review',
  approve: '/approve',
  generate: '/generate',
  generateMore: '/generate-more',
} as const;

export const workflowStages = [
  {
    name: 'Input URL',
    route: workflowRoutePaths.scrape,
    description: 'Reserved entry point for product URL intake and scrape kickoff.',
  },
  {
    name: 'Review / Edit',
    route: workflowRoutePaths.review,
    description: 'Reserved review gate for title, description, and media curation.',
  },
  {
    name: 'Approve snapshot',
    route: workflowRoutePaths.approve,
    description: 'Locks the approved snapshot before generation can begin.',
  },
  {
    name: 'Generate',
    route: workflowRoutePaths.generate,
    description: 'Uses the approved snapshot and a user-defined content count.',
  },
  {
    name: 'Generate more',
    route: workflowRoutePaths.generateMore,
    description: 'Additional batches from the same approved snapshot.',
  },
] as const;
