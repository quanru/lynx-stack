import {
  retainedInputBrowsers,
  retainedInputKeys,
  retainedInputSources,
} from './retained-input-selection.mjs';
import remainingSources from './original-remaining-sources.json' with {
  type: 'json',
};
import {
  bulkReactSources,
  bulkElementSources,
} from './bulk-candidate-sources.mjs';
import {
  browserCoreSources,
  browserElementSources,
} from './browser-variant-sources.mjs';

export const retainedCatalog = {
  id: 'retained-inputs',
  suite: 'web-elements test suite',
  file: 'tests/web-elements.spec.ts',
  keys: retainedInputKeys,
  sources: retainedInputSources,
  browsers: retainedInputBrowsers,
};
const keyboard = [
  'basic-global-bindkeydown',
  'basic-global-bindkeyup',
  'basic-global-bindkeydown-key',
  'basic-global-bindkeydown-code',
  'basic-global-bindkeydown-shift',
  'basic-bindkeydown-out-of-view-noop',
];
const core = {
  package: 'web-core-e2e',
  suite: 'reactlynx3 tests',
  file: 'tests/reactlynx.spec.ts',
  browsers: retainedInputBrowsers,
};
// One declaration expands to four SVG titles. Stable sourceId identifies the
// declaration, while key identifies each independently collected execution.
const componentSources = [
  ...['x-text', 'inline-truncation'].flatMap(parent =>
    [false, true].map(wrapped => ({
      file: 'tests/x-svg-inline.spec.ts',
      title: `x-svg inline layout in ${parent}, wrapped=${wrapped}`,
      sourceId: 'svg-inline-layout',
      suite: null,
    }))
  ),
  ...[
    'x-svg counts as one character and is restored after truncation changes',
    'x-svg sizes custom line truncation like x-image',
  ].map(title => ({
    file: 'tests/x-svg-inline.spec.ts',
    title,
    sourceId: title,
    suite: null,
  })),
  ...[
    'reports selection offsets and direction for x-text and inline-text',
    'stops listening after the event is unbound',
  ].map(title => ({
    file: 'tests/x-text-selection.spec.ts',
    title,
    sourceId: title,
    suite: 'x-text selectionchange',
  })),
  ...[
    'should render iframe with src',
    'should update src attribute',
    'should handle html attribute',
    'should fire bindload event',
    'should fire bindmessage event',
    'should forward iframe postMessage as message event',
    'should not forward messages from outside its iframe',
  ].map(title => ({
    file: 'tests/x-webview.spec.ts',
    title,
    sourceId: title,
    suite: 'x-webview',
  })),
].map(source => ({ ...source, key: `${source.file}::${source.title}` }));
export function catalogSourceCount(catalog) {
  return new Set(
    catalog.sources
      ? catalog.sources.map(source => `${source.file}::${source.sourceId}`)
      : catalog.keys,
  ).size;
}
// Playwright applies grep to the complete file/suite/test title. New retained
// batches select exact title suffixes; escaped punctuation is never a wildcard.
export function sourceSelectionPattern(sources) {
  if (!sources.length) throw new Error('Empty original source selection');
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:^| )(?:${
      sources.map(source =>
        source.fullTitle
          ? escape(source.fullTitle)
          : [source.suite, source.group, source.title].filter(Boolean).map(
            escape,
          ).join(' ')
      ).join('|')
    })$`,
  );
}
export const originalRunnerCatalog = [
  ...[
    {
      id: 'browser-core-csr',
      package: 'web-core-e2e',
      mode: 'CSR',
      sources: browserCoreSources,
      stepName:
        'Validate original remaining Firefox and WebKit core contracts (CSR)',
    },
    {
      id: 'browser-elements',
      package: 'web-elements',
      mode: 'component',
      sources: browserElementSources,
      stepName:
        'Validate original remaining Firefox and WebKit component contracts',
    },
  ].map(runner => {
    const files = [...new Set(runner.sources.map(source => source.file))];
    return {
      ...runner,
      files,
      file: files.join(' '),
      selectSources: true,
      keys: runner.sources.map(source => source.key),
      browsers: ['firefox', 'webkit'],
    };
  }),
  ...['CSR', 'SSR'].map(mode => ({
    ...core,
    id: `bulk-react-${mode.toLowerCase()}`,
    mode,
    selectSources: true,
    sources: bulkReactSources.map(source => ({
      ...source,
      skipBrowsers: source.skipBrowsersByMode[mode],
      earlyReturnBrowsers: source.earlyReturnBrowsersByMode[mode],
    })),
    keys: bulkReactSources.map(source => source.key),
    stepName: `Validate remaining original React contracts (${mode})`,
  })),
  {
    package: 'web-elements',
    id: 'bulk-elements',
    mode: 'component',
    selectSources: true,
    file: 'tests/web-elements.spec.ts',
    sources: bulkElementSources,
    keys: bulkElementSources.map(source => source.key),
    browsers: retainedInputBrowsers,
    stepName: 'Validate remaining original component contracts',
  },
  ...[
    {
      id: 'runtime',
      package: 'web-core-e2e',
      files: ['tests/web-core.test.ts'],
      mode: 'CSR',
      stepName: 'Validate original worker and runtime API contracts',
    },
    ...['csr', 'ssr'].map(mode => ({
      id: `pointer-${mode}`,
      package: 'web-core-e2e',
      files: ['tests/reactlynx.spec.ts'],
      mode: mode.toUpperCase(),
      grep: 'basic-(mts-bindtouchstart|bindmouse|bindwheel-view)$',
      stepName:
        `Validate original pointer event contracts (${mode.toUpperCase()})`,
    })),
    {
      id: 'performance',
      package: 'web-elements',
      files: ['tests/performance.test.ts'],
      browsers: ['chromium'],
      stepName: 'Validate original layout and style performance budgets',
    },
    {
      id: 'markdown',
      package: 'web-elements',
      files: ['tests/x-markdown.spec.ts'],
      grepInvert: 'should fire bindlink and bindimageTap events',
      stepName: 'Validate original Markdown rendering and API contracts',
    },
    {
      id: 'drag-wheel',
      package: 'web-elements',
      files: [
        'tests/scroll-view-mouse-drag.spec.ts',
        'tests/x-foldview-ng-wheel.spec.ts',
      ],
      stepName: 'Validate original mouse drag and wheel contracts',
    },
    {
      id: 'template',
      package: 'web-elements',
      files: ['tests/template.spec.ts'],
      browsers: ['chromium'],
      stepName: 'Validate original Rust and TypeScript template consistency',
    },
  ].map(runner => {
    const sources = remainingSources.filter(source =>
      source.package === runner.package && runner.files.includes(source.file)
    );
    return {
      mode: 'component',
      browsers: retainedInputBrowsers,
      ...runner,
      file: runner.files.join(' '),
      sources,
      keys: sources.map(source => source.key),
    };
  }),
  ...['csr', 'ssr'].map(mode => ({
    ...core,
    id: `keyboard-${mode}`,
    mode: mode.toUpperCase(),
    keys: keyboard.map(name => `basic/${name}`),
    grep:
      'basic-(global-bindkeydown(-key|-code|-shift)?|global-bindkeyup|bindkeydown-out-of-view-noop)$',
    stepName:
      `Validate original keyboard event contracts (${mode.toUpperCase()})`,
  })),
  {
    ...core,
    id: 'animation-csr',
    mode: 'CSR',
    keys: ['apis/api-animate'],
    grep: 'api-animate$',
    stepName: 'Validate original animation sampling (CSR)',
  },
  {
    ...core,
    id: 'lazy-components-csr',
    mode: 'CSR',
    keys: [
      'basic/basic-lynx-reload',
      'basic/basic-lazy-component-multi',
      'basic/basic-lazy-component-multi-import',
    ],
    grep: '(basic-lazy-component-multi(-import)?|basic-lynx-reload)$',
    stepName: 'Validate original ambiguous block inputs (CSR)',
  },
  {
    package: 'web-elements',
    id: 'svg-selection-webview',
    mode: 'component',
    file:
      'tests/x-svg-inline.spec.ts tests/x-text-selection.spec.ts tests/x-webview.spec.ts',
    files: [
      'tests/x-svg-inline.spec.ts',
      'tests/x-text-selection.spec.ts',
      'tests/x-webview.spec.ts',
    ],
    sources: componentSources,
    keys: componentSources.map(source => source.key),
    browsers: retainedInputBrowsers,
    stepName: 'Validate original SVG selection and iframe API contracts',
  },
  {
    package: 'web-elements',
    suite: 'web-elements test suite',
    file: 'tests/web-elements.spec.ts',
    browsers: retainedInputBrowsers,
    id: 'list-api',
    mode: 'component',
    keys: [
      'x-list/auto-scroll-follows-orientation',
      'x-list/get-visible-cells',
      'x-list/get-scroll-container-info',
      'x-list/get-scroll-container-info-horizontal',
    ],
    grep:
      'x-list (auto-scroll-follows-orientation|get-visible-cells|get-scroll-container-info(-horizontal)?)$',
    stepName: 'Validate original list API and orientation contracts',
  },
];
export function originalRunner(id) {
  const item = originalRunnerCatalog.find(item => item.id === id);
  if (!item) throw new Error('Unknown original evidence runner');
  return item;
}
export const originalRunnerSourceCount = new Set(
  originalRunnerCatalog.flatMap(item =>
    item.sources
      ? item.sources.map(source =>
        `${item.package}/${source.file}::${source.sourceId}`
      )
      : item.keys.map(key => `${item.package}/${item.file}::${key}`)
  ),
).size;

// Only evidence options change. Each original CLI retains its grep, profiles,
// workers, SSR mode and its own server invocation; no extra execution is added.
export function originalEvidenceConfig(
  original,
  packageName,
  directory,
  env = process.env,
) {
  const runner = originalRunner(env.ORIGINAL_EVIDENCE_RUNNER);
  if (
    runner.package !== packageName
    || (runner.mode === 'SSR') !== Boolean(env.ENABLE_SSR)
  ) {
    throw new Error('Original evidence runner package/render mode mismatch');
  }
  const root = `${directory}/midscene-original-results/${runner.id}`;
  return {
    ...original,
    ...(runner.selectSources
      ? { grep: sourceSelectionPattern(runner.sources) }
      : {}),
    use: { ...original.use, screenshot: 'on' },
    reporter: [['line'], ['html', {
      outputFolder: `${root}/html`,
      open: 'never',
    }], ['json', { outputFile: `${root}/report.json` }]],
  };
}
