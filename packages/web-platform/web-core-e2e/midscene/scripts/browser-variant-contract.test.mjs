import assert from 'node:assert/strict';
import test from 'node:test';
import {
  browserCoreSources,
  browserElementSources,
} from './browser-variant-sources.mjs';
import { browserSourceDescriptor } from './browser-source-audit.mjs';
import {
  originalRunnerCatalog,
  retainedCatalog,
} from './original-runner-catalog.mjs';

const sources = [...browserCoreSources, ...browserElementSources];
test('required browser variant snapshot pins 461 declarations and 465 complete titles', () => {
  assert.equal(browserCoreSources.length, 275);
  assert.equal(browserElementSources.length, 190);
  assert.equal(
    new Set(
      sources.map(item =>
        item.package + '/' + item.file + '::' + item.sourceId
      ),
    ).size,
    461,
  );
  assert.equal(
    new Set(sources.map(item => item.package + '/' + item.key)).size,
    465,
  );
  for (const item of sources) {
    assert.deepEqual(
      item,
      browserSourceDescriptor(item.package, item.file, item.line, item.title),
    );
    assert.deepEqual(item.earlyReturnBrowsers, []);
    assert.ok(
      item.skipBrowsers.every(browser =>
        ['firefox', 'webkit'].includes(browser)
      ),
    );
  }
  assert.equal(
    browserCoreSources.reduce((n, item) => n + item.skipBrowsers.length, 0),
    2,
  );
  assert.equal(
    browserElementSources.reduce((n, item) => n + item.skipBrowsers.length, 0),
    8,
  );
});
test('two original CSS loops retain three values each but only one declaration identity', () => {
  const dynamic = sources.filter(item => item.expansion);
  assert.equal(dynamic.length, 6);
  assert.equal(
    new Set(dynamic.map(item => item.file + '::' + item.sourceId)).size,
    2,
  );
  for (const file of ['tests/reactlynx.spec.ts', 'tests/ssr-no-js.spec.ts']) {
    const rows = dynamic.filter(item => item.file === file);
    assert.deepEqual(rows.map(item => item.title).sort(), [
      'config-css-inheritance-default',
      'config-css-inheritance-false',
      'config-css-inheritance-true',
    ]);
    assert.equal(new Set(rows.map(item => item.expansion.loopSha256)).size, 1);
    assert.ok(
      rows.every(item =>
        item.expansion.values.join(',') === 'true,false,default'
      ),
    );
  }
});
test('new Firefox/WebKit variants cannot overlap prior runner identities or opt into hydrated SSR', () => {
  const prior = [...originalRunnerCatalog, {
    ...retainedCatalog,
    package: 'web-elements',
    mode: 'component',
  }]
    .filter(runner => !runner.id.startsWith('browser-'));
  for (const item of sources) {
    for (const browser of ['firefox', 'webkit']) {
      const match = prior.some(runner =>
        runner.package === item.package
        && runner.mode
          === (item.package === 'web-core-e2e' ? 'CSR' : 'component')
        && runner.browsers.includes(browser)
        && (runner.sources
          ? runner.sources.some(source =>
            source.file === item.file && source.title === item.title
            && (source.group ?? source.suite) === (item.group ?? item.suite)
          )
          : runner.file === item.file
            && runner.keys.includes(item.group + '/' + item.title))
      );
      assert.equal(match, false, item.key + ':' + browser);
    }
  }
});
