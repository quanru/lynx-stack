import {
  retainedInputBrowsers,
  retainedInputKeys,
} from './retained-input-selection.mjs';

export const retainedCatalog = {
  id: 'retained-inputs',
  suite: 'web-elements test suite',
  file: 'tests/web-elements.spec.ts',
  keys: retainedInputKeys,
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
export const originalRunnerCatalog = [
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
    item.keys.map(key => `${item.package}/${item.file}::${key}`)
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
    use: { ...original.use, screenshot: 'on' },
    reporter: [['line'], ['html', {
      outputFolder: `${root}/html`,
      open: 'never',
    }], ['json', { outputFile: `${root}/report.json` }]],
  };
}
