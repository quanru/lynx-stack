// Read-only collection audit. No server, browser, model or test callback runs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const mid = path.join(repo, 'packages/web-platform/web-core-e2e/midscene');
const require = createRequire(path.join(mid, 'package.json'));
const ts = require('typescript');
const moduleAt = name =>
  import(pathToFileURL(path.join(mid, 'scripts', name)).href);
const { sourceGuardPolicy, singleThreadMiddlewareBindings } = await moduleAt(
  'bulk-source-audit.mjs',
);
const { originalRunnerCatalog, retainedCatalog } = await moduleAt(
  'original-runner-catalog.mjs',
);
const { caseNames } = await moduleAt('case-inventory.mjs');
const names = await caseNames(mid);
const required = [], optionalSSR = [], exclusions = [], unknown = [];
const collected = {}, sourceHashes = {};
const sha256 = value => createHash('sha256').update(value).digest('hex');

for (
  const [pkg, mode, files] of [
    ['web-core-e2e', 'CSR', []],
    // Upstream's required matrix is CSR only. These two suites have meaningful
    // hydrated-SSR branches; do not double-count SSR-No-JS's fixed SSR URL.
    ['web-core-e2e', 'SSR', [
      'tests/reactlynx.spec.ts',
      'tests/reactlynx-css-var-fallback.spec.ts',
    ]],
    ['web-elements', 'component', []],
  ]
) {
  const cwd = path.join(repo, 'packages/web-platform', pkg);
  const localRequire = createRequire(path.join(cwd, 'package.json'));
  const cli = path.join(
    path.dirname(localRequire.resolve('@playwright/test/package.json')),
    'cli.js',
  );
  const report = JSON.parse(execFileSync(process.execPath, [
    cli,
    'test',
    ...files,
    '--config',
    'playwright.config.ts',
    '--list',
    '--reporter',
    'json',
  ], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 20_000_000,
    timeout: 30_000,
    env: {
      ...process.env,
      CI: '1',
      ENABLE_SSR: mode === 'SSR' ? '1' : '',
      ENABLE_MULTI_THREAD: '',
      PLAYWRIGHT_JSON_OUTPUT_FILE: '',
      PLAYWRIGHT_JSON_OUTPUT_NAME: '',
    },
  }));
  if (report.errors.length) {
    throw new Error('Original collection reported errors');
  }
  const asts = new Map();
  function declaration(file, line) {
    if (!asts.has(file)) {
      const text = fs.readFileSync(path.join(cwd, file), 'utf8');
      sourceHashes[`${pkg}/${file}`] = sha256(text);
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true),
        map = new Map();
      function visit(node) {
        if (
          ts.isCallExpression(node)
          && ['test', 'test.skip', 'test.fixme'].includes(
            node.expression.getText(sf),
          )
          && node.arguments.length >= 2
          && (ts.isStringLiteralLike(node.arguments[0])
            || ts.isTemplateExpression(node.arguments[0]))
        ) {
          map.set(
            sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            node,
          );
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
      asts.set(file, { sf, map });
    }
    const { sf, map } = asts.get(file);
    if (!map.has(line)) {
      throw new Error(`Unmapped collection location: ${pkg}/${file}:${line}`);
    }
    return { sf, node: map.get(line) };
  }
  function visit(suite, parents = []) {
    const titles = [...parents, suite.title];
    for (const spec of suite.specs ?? []) {
      const group = titles.at(-1);
      for (const item of spec.tests) {
        if (item.results.length) {
          throw new Error('Collection unexpectedly executed a callback');
        }
        const browser = item.projectName;
        const bucket = `${pkg}|${mode}|${spec.file}`;
        collected[bucket] = (collected[bucket] ?? 0) + 1;
        const catalogs = [...originalRunnerCatalog, {
          ...retainedCatalog,
          package: 'web-elements',
          mode: 'component',
        }]
          .filter(catalog =>
            catalog.package === pkg && catalog.mode === mode
            && catalog.browsers.includes(browser)
          );
        const represented = catalogs.some(catalog =>
          catalog.sources
            ? catalog.sources.some(source =>
              source.file === spec.file && source.title === spec.title
              && (!source.fullTitle
                || source.fullTitle
                  === [...titles.slice(1), spec.title].join(' '))
              && (!(source.group ?? source.suite)
                || (source.group ?? source.suite) === group)
            )
            : catalog.file === spec.file
              && catalog.keys.includes(`${group}/${spec.title}`)
        );
        if (represented) continue;
        const { sf, node } = declaration(spec.file, spec.line);
        let policy;
        try {
          policy = sourceGuardPolicy(
            node.arguments.at(-1),
            sf,
            pkg === 'web-core-e2e' && spec.file === 'tests/middleware.spec.ts'
              ? singleThreadMiddlewareBindings(sf)
              : {},
          );
        } catch (error) {
          unknown.push({
            pkg,
            mode,
            file: spec.file,
            title: spec.title,
            reason: error.message,
          });
          continue;
        }
        let skipped = item.expectedStatus === 'skipped'
          || policy.skipBrowsersByMode[mode === 'SSR' ? 'SSR' : 'CSR'].includes(
            browser,
          );
        // These reviewed guards live in beforeEach/shared goto rather than the callback.
        if (
          spec.file === 'tests/middleware.spec.ts' && browser !== 'chromium'
        ) skipped = true;
        if (
          spec.file === 'tests/performance.test.ts' && browser !== 'chromium'
        ) skipped = true;
        if (skipped) continue;
        const returned = policy
          .earlyReturnBrowsersByMode[mode === 'SSR' ? 'SSR' : 'CSR'].includes(
            browser,
          );
        const empty = node.arguments.at(-1).body?.statements?.length === 0;
        let aliases = [];
        if (browser === 'chromium') {
          if (spec.file === 'tests/ssr-no-js.spec.ts') {
            aliases = [`ssr-no-js/${spec.title}`];
          } else if (spec.file === 'tests/middleware.spec.ts') {
            aliases = [`middleware/${spec.title}`];
          } else if (pkg === 'web-elements') {
            aliases = [
              `web-elements/${
                spec.title.includes('/') ? spec.title : `${group}/${spec.title}`
              }`,
            ];
            if (spec.file === 'tests/component-event.spec.ts') {
              aliases = [
                'web-elements/component-events/'
                + (spec.title.startsWith('enableEvent')
                  ? 'enable-disable-reference-count'
                  : 'listener-reference-count'),
              ];
            }
            if (
              spec.file === 'tests/x-markdown.spec.ts'
              && spec.title === 'should fire bindlink and bindimageTap events'
            ) {
              aliases = ['web-elements/x-markdown/bindlink-bindimageTap'];
            }
          } else aliases = [`${mode === 'SSR' ? 'ssr/' : ''}${spec.title}`];
        }
        if (aliases.some(alias => names.includes(alias))) continue;
        const row = {
          package: pkg,
          mode,
          file: spec.file,
          line: spec.line,
          group,
          title: spec.title,
          fullTitle: [...titles.slice(1), spec.title].join(' '),
          browser,
        };
        const knownEmpty = empty && pkg === 'web-core-e2e'
          && spec.file === 'tests/reactlynx.spec.ts'
          && spec.title === 'basic-element-x-audio-tt-play';
        const duplicateTemplate = pkg === 'web-elements'
          && spec.file === 'tests/template.spec.ts'
          && spec.title === 'sync between rust and ts'
          && browser !== 'chromium';
        if (knownEmpty || returned || duplicateTemplate) {
          exclusions.push({
            ...row,
            reason: empty
              ? 'empty callback'
              : returned
              ? 'source return'
              : 'duplicate non-UI browser allocation',
          });
        } else (mode === 'SSR' ? optionalSSR : required).push(row);
      }
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  report.suites.forEach(suite => visit(suite));
}
const identity = row =>
  [row.package, row.mode, row.file, row.line, row.title, row.browser].join('|');
const byIdentity = (a, b) => identity(a).localeCompare(identity(b));
required.sort(byIdentity);
optionalSSR.sort(byIdentity);
for (const rows of [required, optionalSSR]) {
  if (new Set(rows.map(identity)).size !== rows.length) {
    throw new Error('Duplicate variant identity');
  }
}
function summary(rows) {
  const buckets = {};
  for (const row of rows) {
    const key = [row.package, row.mode, row.file, row.browser].join('|');
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return {
    variants: rows.length,
    declarations:
      new Set(rows.map(row => `${row.package}/${row.file}:${row.line}`)).size,
    expandedTitles: new Set(
      rows.map(row => `${row.package}/${row.file}:${row.line}:${row.title}`),
    ).size,
    setSha256: sha256(rows.map(identity).join('\n')),
    buckets,
  };
}
const output = {
  schemaVersion: 1,
  proof:
    'Collection and static guards only; not runtime acceptance or fresh assertion equivalence',
  // Container checkout ownership may differ. Trust only this known checkout for
  // this read-only metadata command; never change global Git configuration.
  head: execFileSync('git', [
    '-c',
    `safe.directory=${repo}`,
    'rev-parse',
    'HEAD',
  ], {
    cwd: repo,
    encoding: 'utf8',
  }).trim(),
  required: summary(required),
  optionalSSR: summary(optionalSSR),
  sourceHashes,
  collected,
  unknown,
  exclusions,
  ...(!process.argv.includes('--full')
    ? {}
    : { requiredVariants: required, optionalSSRVariants: optionalSSR }),
};
console.log(JSON.stringify(output, null, 2));
if (unknown.length || required.length) process.exitCode = 1;
