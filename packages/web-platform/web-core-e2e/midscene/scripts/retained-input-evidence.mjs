import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  retainedCatalog,
  catalogSourceCount,
} from './original-runner-catalog.mjs';

// Local, verified relative paths only. Publishing owns URL construction later.
function existingFile(root, value) {
  if (
    typeof value !== 'string' || !value || value.includes('\0')
    || value.includes('\\') || value.split('/').includes('..')
    || /^[a-z][a-z\d+.-]*:/i.test(value)
  ) {
    throw new Error('Invalid evidence path');
  }
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (
    !relative || relative === '..' || relative.startsWith('../')
    || path.isAbsolute(relative)
  ) {
    throw new Error('Evidence escapes its root');
  }
  try {
    const resolved = realpathSync(absolute);
    const realRelative = path.relative(realpathSync(root), resolved);
    if (
      realRelative === '..' || realRelative.startsWith('../')
      || path.isAbsolute(realRelative)
    ) {
      throw new Error('Evidence symlink escapes its root');
    }
    if (!statSync(resolved).isFile()) throw new Error('Evidence is not a file');
    return relative.split(path.sep).join('/');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// Run on the PRODUCER before upload: JSON attachment.path values refer to that
// machine's filesystem. Publish this root-relative manifest alongside the entire
// evidenceRoot directory; never reinterpret producer absolute paths after download.
// Shape follows Playwright 1.61.1 JSONReporter._serializeTest/Result: suites/specs,
// projectName, expectedStatus, outcome status, results[].retry/status/attachments.
export function retainedInputEvidence(
  report,
  evidenceRoot,
  catalog = retainedCatalog,
) {
  const { keys: sourceKeys, browsers, suite: suiteName, file: sourceFile } =
    catalog;
  const root = path.resolve(evidenceRoot);
  if (!statSync(root).isDirectory()) {
    throw new Error('Evidence root is not a directory');
  }
  if (
    !report || !Array.isArray(report.suites) || !Array.isArray(report.errors)
  ) {
    throw new Error('Expected a complete Playwright JSON report');
  }
  const html = existingFile(root, 'html/index.html');
  const records = new Map();
  function visit(suite, parents = []) {
    const titles = [...parents, suite.title];
    for (const spec of suite.specs ?? []) {
      const group = titles.at(-1);
      const descriptor = catalog.sources?.find(source =>
        source.file === spec.file && source.title === spec.title
      );
      const source = catalog.sources
        ? descriptor?.key
        : `${group}/${spec.title}`;
      if (
        (catalog.sources
          ? !descriptor
            || (descriptor.suite
              ? !titles.includes(descriptor.suite)
              : titles.length !== 1)
          : !titles.includes(suiteName))
        || !sourceKeys.includes(source)
        || spec.file !== (descriptor?.file ?? sourceFile)
        || !Number.isInteger(spec.line) || spec.line < 1
      ) {
        throw new Error('Unexpected retained source declaration');
      }
      for (const item of spec.tests ?? []) {
        if (!browsers.includes(item.projectName)) {
          throw new Error('Unexpected browser profile');
        }
        const key = `${source}:${item.projectName}`;
        if (records.has(key)) {
          throw new Error('Duplicate source/browser result');
        }
        if (!Array.isArray(item.results)) {
          throw new Error('Missing attempt list');
        }
        let previous = -1;
        for (const attempt of item.results) {
          if (
            !Number.isInteger(attempt.retry) || attempt.retry <= previous
            || !['passed', 'failed', 'timedOut', 'skipped', 'interrupted']
              .includes(attempt.status)
          ) {
            throw new Error('Invalid attempt sequence');
          }
          previous = attempt.retry;
        }
        const final = item.results.at(-1);
        const screenshots = (final?.attachments ?? [])
          .filter(attachment =>
            attachment.name === 'screenshot'
            && attachment.contentType === 'image/png'
          )
          .map(attachment => existingFile(root, attachment.path))
          .filter(Boolean);
        if (item.expectedStatus !== 'passed') {
          throw new Error('Unexpected source expectedStatus');
        }
        if (
          !['expected', 'unexpected', 'flaky', 'skipped'].includes(item.status)
        ) {
          throw new Error('Invalid Playwright outcome');
        }
        records.set(key, {
          source,
          ...(descriptor
            ? { sourceId: descriptor.sourceId, sourceFile: descriptor.file }
            : {}),
          browser: item.projectName,
          line: spec.line,
          status: final?.status ?? 'not-run',
          outcome: item.status,
          retry: final?.retry ?? null,
          durationMs: typeof final?.duration === 'number'
              && Number.isFinite(final.duration) && final.duration >= 0
            ? final.duration
            : null,
          screenshots,
          screenshotUnavailable: screenshots.length
            ? null
            : 'No final-attempt screenshot file',
          report: html,
          reportUnavailable: html ? null : 'HTML report was not generated',
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  for (const suite of report.suites) visit(suite);
  const cases = sourceKeys.flatMap(source =>
    browsers.map(browser =>
      records.get(`${source}:${browser}`) ?? {
        source,
        ...(catalog.sources
          ? {
            sourceId: catalog.sources.find(item =>
              item.key === source
            ).sourceId,
            sourceFile: catalog.sources.find(item => item.key === source).file,
          }
          : {}),
        browser,
        line: null,
        status: 'not-run',
        outcome: 'missing',
        retry: null,
        durationMs: null,
        screenshots: [],
        screenshotUnavailable: 'Source/browser result missing',
        report: html,
        reportUnavailable: html ? null : 'HTML report was not generated',
      }
    )
  );
  return {
    schemaVersion: 1,
    kind: 'retained-original-input',
    sourceDeclarations: catalogSourceCount(catalog),
    runnerId: catalog.id,
    sourceFile,
    expectedExecutions: cases.length,
    runnerErrorCount: report.errors.length,
    cases,
  };
}
