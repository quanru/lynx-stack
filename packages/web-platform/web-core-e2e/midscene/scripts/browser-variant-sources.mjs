import sources from './browser-variant-sources.json' with { type: 'json' };

// Required CSR/component Firefox and WebKit coverage; optional hydrated SSR is excluded.
export const browserCoreSources = sources.filter(item =>
  item.package === 'web-core-e2e'
);
export const browserElementSources = sources.filter(item =>
  item.package === 'web-elements'
);
