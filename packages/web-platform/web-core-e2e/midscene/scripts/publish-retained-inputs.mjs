import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  retainedCatalog,
  catalogSourceCount,
} from './original-runner-catalog.mjs';

function relativePath(value) {
  if (
    typeof value !== 'string' || !value || path.isAbsolute(value)
    || /[\\\x00-\x1f\x7f?#%:]/.test(value)
    || value.split('/').some(part => !part || part === '.' || part === '..')
  ) {
    throw new Error('Unsafe publication-relative path');
  }
  return value;
}

function inspectTree(root) {
  const info = lstatSync(root);
  if (info.isSymbolicLink()) {
    throw new Error('Publication tree contains a symlink');
  }
  if (info.isDirectory()) {
    for (const name of readdirSync(root)) {
      relativePath(name);
      inspectTree(path.join(root, name));
    }
  } else if (!info.isFile()) {
    throw new Error('Publication tree contains a special file');
  }
}

function rejectSymlinkAncestors(target) {
  let ancestor = path.resolve(target);
  while (path.dirname(ancestor) !== ancestor) {
    try {
      if (lstatSync(ancestor).isSymbolicLink()) {
        throw new Error('Publication path has a symlink ancestor');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    ancestor = path.dirname(ancestor);
  }
}

function fileOrNull(root, relative, kind) {
  if (relative === null) return null;
  relativePath(relative);
  if (
    kind === 'image'
    && (!relative.startsWith('results/') || !relative.endsWith('.png'))
  ) {
    throw new Error('Screenshot is not a final runner result PNG');
  }
  if (kind === 'report' && relative !== 'html/index.html') {
    throw new Error('Unexpected HTML entry point');
  }
  const file = path.join(root, relative);
  if (!existsSync(file)) return null;
  if (!lstatSync(file).isFile()) {
    throw new Error('Evidence entry is not a file');
  }
  return relative;
}

const escapeHTML = value =>
  String(value).replace(/[&<>"']/g, character =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;',
    })[character]);

// The caller must supply the selected CURRENT attempt's retained-inputs directory.
// No artifact search, attempt fallback or producer absolute path interpretation.
export function publishRetainedInputs(
  {
    evidenceRoot,
    destination,
    sitePrefix,
    publicBaseUrl,
    artifact = null,
    catalog = retainedCatalog,
  },
) {
  const sourceCount = catalogSourceCount(catalog);
  const expectedCount = catalog.keys.length * catalog.browsers.length;
  relativePath(sitePrefix);
  if (
    artifact !== null
    && (typeof artifact !== 'string' || !artifact.trim()
      || /[\x00-\x1f\x7f]/.test(artifact))
  ) {
    throw new Error('Invalid artifact name');
  }
  const base = publicBaseUrl ? new URL(publicBaseUrl) : null;
  if (
    base
    && (base.protocol !== 'https:' || base.username || base.password
      || base.search
      || base.hash)
  ) {
    throw new Error('Expected a clean HTTPS publication base URL');
  }
  if (base && !base.pathname.endsWith('/')) base.pathname += '/';
  rejectSymlinkAncestors(evidenceRoot);
  inspectTree(evidenceRoot);
  const manifestFile = path.join(evidenceRoot, 'evidence.json');
  if (lstatSync(manifestFile).size > 8 * 1024 * 1024) {
    throw new Error('Manifest is too large');
  }
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  if (
    manifest.schemaVersion !== 1 || manifest.kind !== 'retained-original-input'
    || manifest.sourceDeclarations !== sourceCount
    || manifest.expectedExecutions !== expectedCount
    || manifest.runnerId !== catalog.id || manifest.sourceFile !== catalog.file
    || !Number.isInteger(manifest.runnerErrorCount)
    || manifest.runnerErrorCount < 0
    || !['success', 'failure', 'skipped', 'cancelled'].includes(
      manifest.producerResult,
    )
    || typeof manifest.evidenceComplete !== 'boolean'
    || !Array.isArray(manifest.cases) || manifest.cases.length !== expectedCount
  ) {
    throw new Error('Invalid retained input evidence manifest');
  }
  const seen = new Set();
  const rows = manifest.cases.map(row => {
    const key = `${row.source}:${row.browser}`;
    const descriptor = catalog.sources?.find(item => item.key === row.source);
    const policy = row.evidencePolicy ?? 'ui';
    if (
      !catalog.keys.includes(row.source)
      || !['ui', 'non-ui', 'source-skip', 'source-return'].includes(policy)
      || (policy === 'source-return'
        && (!descriptor?.earlyReturnBrowsers?.includes(row.browser)
          || row.status !== 'passed' || row.outcome !== 'expected'
          || row.expectedStatus !== 'passed'))
      || (policy === 'non-ui' && descriptor?.evidencePolicy !== 'non-ui')
      || (descriptor?.evidencePolicy === 'non-ui' && policy !== 'non-ui')
      || (row.expectedStatus !== undefined
        && ![null, 'passed', 'skipped'].includes(row.expectedStatus))
      || (policy === 'source-skip'
        && (!descriptor?.skipBrowsers?.includes(row.browser)
          || row.status !== 'skipped' || row.outcome !== 'skipped'
          || row.expectedStatus !== 'skipped'))
      || (catalog.sources
        && (!descriptor || row.sourceId !== descriptor.sourceId
          || row.sourceFile !== descriptor.file))
      || !catalog.browsers.includes(row.browser)
      || seen.has(key) || !Array.isArray(row.screenshots)
      || !['passed', 'failed', 'timedOut', 'skipped', 'interrupted', 'not-run']
        .includes(row.status)
      || !['expected', 'unexpected', 'flaky', 'skipped', 'missing'].includes(
        row.outcome,
      )
    ) {
      throw new Error('Invalid or duplicate source/browser evidence');
    }
    seen.add(key);
    const report = fileOrNull(evidenceRoot, row.report, 'report');
    return {
      ...row,
      evidencePolicy: policy === 'source-return' && !report ? 'ui' : policy,
      durationMs: typeof row.durationMs === 'number'
          && Number.isFinite(row.durationMs) && row.durationMs >= 0
        ? row.durationMs
        : null,
      screenshots: row.screenshots.map(file =>
        fileOrNull(evidenceRoot, file, 'image')
      ).filter(Boolean),
      report,
    };
  });
  if (existsSync(destination)) {
    throw new Error('Publication destination already exists');
  }
  // Reject an existing symlink in every ancestor, not only the final directory.
  rejectSymlinkAncestors(destination);
  mkdirSync(destination, { recursive: true });
  for (const directory of ['html', 'results']) {
    const source = path.join(evidenceRoot, directory);
    if (existsSync(source)) {
      cpSync(source, path.join(destination, directory), { recursive: true });
    }
  }
  // Publication-only aliases keep every Summary row within GitHub's byte cap.
  // Hash the verified copied bytes; original results and HTML assets stay intact.
  const previewAliases = new Map();
  for (const row of rows) {
    const relative = row.screenshots[0];
    if (!relative || previewAliases.has(relative)) continue;
    const bytes = readFileSync(path.join(destination, relative));
    if (!bytes.equals(readFileSync(path.join(evidenceRoot, relative)))) {
      throw new Error('Copied preview differs from original PNG bytes');
    }
    const alias = `p/${createHash('sha256').update(bytes).digest('hex')}.png`;
    mkdirSync(path.join(destination, 'p'), { recursive: true });
    const target = path.join(destination, alias);
    if (!existsSync(target)) writeFileSync(target, bytes, { flag: 'wx' });
    if (!readFileSync(target).equals(bytes)) {
      throw new Error(
        'Published preview alias differs from original PNG bytes',
      );
    }
    previewAliases.set(relative, alias);
  }
  const url = relative =>
    new URL(
      [sitePrefix, relative].join('/').split('/').map(encodeURIComponent).join(
        '/',
      ),
      base,
    ).href;
  const passed = rows.filter(row =>
    row.evidencePolicy !== 'source-return'
    && row.status === 'passed' && row.outcome === 'expected'
    && (row.evidencePolicy === 'non-ui' || row.screenshots.length > 0)
    && row.report
  );
  const attention = rows.filter(row =>
    !passed.includes(row)
    && !['source-skip', 'source-return'].includes(row.evidencePolicy)
  );
  const exclusions = rows.filter(row =>
    ['source-skip', 'source-return'].includes(row.evidencePolicy)
  );
  // Infrastructure disposition is independent of individual assertion results.
  // Preserve 84 passed cases when the runner failed after their callbacks, but
  // never present that run as an overall success.
  const infrastructureErrors = [
    ...(manifest.producerResult !== 'success'
      ? [
        manifest.producerResult === 'failure'
          ? 'The original runner producer failed.'
          : `The original runner producer was ${manifest.producerResult}.`,
      ]
      : []),
    ...(!manifest.evidenceComplete
      ? ['The producer evidence inventory is incomplete.']
      : []),
  ];
  const hasAttention = Boolean(
    attention.length || manifest.runnerErrorCount
      || infrastructureErrors.length,
  );
  const supplemental = {
    label: 'Original input contracts',
    sourceCount,
    expectedCount,
    errors: [
      ...infrastructureErrors,
      ...(manifest.runnerErrorCount
        ? [
          `Original runner reported ${manifest.runnerErrorCount} infrastructure errors.`,
        ]
        : []),
    ],
    cases: rows.map(row => {
      const hasEvidence =
        (row.evidencePolicy === 'non-ui' || row.screenshots.length > 0)
        && Boolean(row.report);
      const status = row.evidencePolicy === 'source-return'
        ? 'not-applicable'
        : row.evidencePolicy === 'source-skip'
        ? 'skipped'
        : row.status === 'not-run' || row.status === 'skipped'
        ? 'not-run'
        : row.status === 'passed' && hasEvidence
        ? row.outcome === 'expected'
          ? 'success'
          : row.outcome === 'flaky'
          ? 'flaky'
          : 'failed'
        : 'failed';
      const reasons = [
        ...(row.evidencePolicy === 'source-return'
          ? [
            'Original source/browser branch returned before assertions; the callback completed, but the full contract was not validated.',
          ]
          : []),
        ...(row.evidencePolicy === 'source-skip'
          ? [
            'Original source/browser guard skipped this execution; no screenshot exists.',
          ]
          : []),
        ...(row.evidencePolicy === 'non-ui'
          ? [
            'Original template consistency contract has no browser UI or screenshot.',
          ]
          : []),
        ...(status === 'success'
          ? []
          : [`Original Playwright result: ${row.status} (${row.outcome}).`]),
        ...(!row.screenshots.length
          ? ['Final-attempt screenshot unavailable.']
          : []),
        ...(!row.report ? ['HTML report unavailable.'] : []),
      ];
      return {
        platform: row.browser,
        name: row.source,
        status,
        evidencePolicy: row.evidencePolicy ?? 'ui',
        reason: reasons.join(' ') || null,
        durationMs: row.evidencePolicy === 'source-skip'
          ? null
          : row.durationMs,
        previewPath:
          ['ui', 'source-return'].includes(row.evidencePolicy ?? 'ui')
            && row.screenshots.length
            ? `${sitePrefix}/${previewAliases.get(row.screenshots[0])}`
            : null,
        reportPath: row.report ? `${sitePrefix}/${row.report}` : null,
        artifact,
      };
    }),
  };
  const table = items =>
    [
      '| Case | Browser | Result | Screenshot | Report |',
      '| --- | --- | --- | --- | --- |',
      ...items.map(row => {
        const report = !base ? 'Not published' : row.report
          ? `[Open report](${url(row.report)})`
          : 'Unavailable';
        const images = !base ? 'Not published' : row.screenshots.length
          ? row.screenshots.map(file => {
            const image = `<img src="${
              escapeHTML(url(file))
            }" width="240" alt="Final-attempt screenshot">`;
            return row.report
              ? `<a href="${escapeHTML(url(row.report))}">${image}</a>`
              : image;
          }).join(' ')
          : 'Unavailable — no final-attempt screenshot';
        return `| ${row.source} | ${row.browser} | ${row.status}${
          row.outcome !== 'expected' ? ` (${row.outcome})` : ''
        } | ${images} | ${report} |`;
      }),
    ].join('\n');
  const summary = [
    '## Original input contracts',
    '',
    `${
      hasAttention ? '⚠️' : '✅'
    } ${attention.length} cases need attention · ${passed.length} passed · ${
      exclusions.filter(row => row.evidencePolicy === 'source-skip').length
    } source-skipped · ${
      exclusions.filter(row => row.evidencePolicy === 'source-return').length
    } source-returned · ${manifest.runnerErrorCount} runner errors · ${infrastructureErrors.length} infrastructure errors`,
    '',
    'Retained original Playwright inputs; excluded from the AI/YAML case count.',
    '',
    ...(infrastructureErrors.length
      ? [infrastructureErrors.join(' '), '']
      : []),
    ...(attention.length ? [table(attention), ''] : []),
    ...(passed.length || exclusions.length
      ? [
        '<details>',
        '<summary>Passed original contracts and source exclusions</summary>',
        '',
        table([...passed, ...exclusions]),
        '',
        '</details>',
        '',
      ]
      : []),
  ].join('\n');
  return {
    summary,
    supplemental,
    cases: rows,
    sourceDeclarations: sourceCount,
    expectedExecutions: expectedCount,
    passed: passed.length,
    needsAttention: attention.length,
    runnerErrorCount: manifest.runnerErrorCount,
    producerResult: manifest.producerResult,
    evidenceComplete: manifest.evidenceComplete,
    infrastructureErrors,
    infrastructureErrorCount: infrastructureErrors.length,
    hasAttention,
  };
}
