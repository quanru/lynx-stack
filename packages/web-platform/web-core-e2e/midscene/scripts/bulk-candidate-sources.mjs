import sources from './bulk-candidate-sources.json' with { type: 'json' };

// Frozen source identities; no test callback is rewritten or generated.
export const bulkReactSources = sources.filter(item =>
  item.package === 'web-core-e2e'
);
export const bulkElementSources = sources.filter(item =>
  item.package === 'web-elements'
);
