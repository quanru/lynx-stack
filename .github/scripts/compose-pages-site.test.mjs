import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { composeSite } from './compose-pages-site.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'compose-pages-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'site');
  async function payload(name, files) {
    const directory = path.join(root, name);
    for (const [file, contents] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(directory, file)), {
        recursive: true,
      });
      await writeFile(path.join(directory, file), contents);
    }
    return directory;
  }
  return { site, payload };
}

test('reports arriving before the first upstream website are archived without deploying', async (t) => {
  const { site, payload } = await fixture(t);
  const report = await payload('report', {
    'index.html': 'latest',
    'runs/1-1/report.html': 'evidence',
  });
  assert.equal(
    await composeSite({
      site,
      incoming: report,
      component: 'midscene',
      requireWebsite: true,
    }),
    false,
  );
  await assert.rejects(readFile(path.join(site, 'index.html')), {
    code: 'ENOENT',
  });
  const website = await payload('website', {
    'index.html': 'website',
    'repl/index.html': 'repl',
  });
  assert.equal(
    await composeSite({
      site,
      incoming: website,
      component: 'website',
      requireWebsite: true,
    }),
    true,
  );
  assert.equal(
    await readFile(path.join(site, 'midscene/runs/1-1/report.html'), 'utf8'),
    'evidence',
  );
  assert.equal(
    await readFile(path.join(site, 'repl/index.html'), 'utf8'),
    'repl',
  );
});

test('alternating website and report deployments retain the website and all previous evidence', async (t) => {
  const { site, payload } = await fixture(t);
  const website = await payload('website1', {
    'index.html': 'website1',
    'obsolete.js': 'old',
    'CNAME': 'lynx-stack.dev',
  });
  await composeSite({
    site,
    incoming: website,
    component: 'website',
    requireWebsite: true,
  });
  for (const id of [1, 2]) {
    const report = await payload(`report${id}`, {
      'index.html': `latest${id}`,
      [`runs/${id}-1/preview.png`]: `image${id}`,
    });
    await composeSite({
      site,
      incoming: report,
      component: 'midscene',
      requireWebsite: true,
    });
  }
  assert.equal(
    await readFile(path.join(site, 'index.html'), 'utf8'),
    'website1',
  );
  assert.equal(
    await readFile(path.join(site, 'CNAME'), 'utf8'),
    'lynx-stack.dev',
  );
  const next = await payload('website2', {
    'index.html': 'website2',
    'genui/index.html': 'playground',
    'CNAME': 'lynx-stack.dev',
  });
  await composeSite({
    site,
    incoming: next,
    component: 'website',
    requireWebsite: true,
  });
  await assert.rejects(readFile(path.join(site, 'obsolete.js')), {
    code: 'ENOENT',
  });
  assert.equal(
    await readFile(path.join(site, 'midscene/runs/1-1/preview.png'), 'utf8'),
    'image1',
  );
  assert.equal(
    await readFile(path.join(site, 'midscene/runs/2-1/preview.png'), 'utf8'),
    'image2',
  );
  assert.equal(
    await readFile(path.join(site, 'midscene/index.html'), 'utf8'),
    'latest2',
  );
});

test('rejects reserved paths and symlinks before changing the website', async (t) => {
  const { site, payload } = await fixture(t);
  const initial = await payload('initial', { 'index.html': 'original' });
  await composeSite({
    site,
    incoming: initial,
    component: 'website',
    requireWebsite: true,
  });
  const invalid = await payload('invalid', {
    'index.html': 'bad',
    'midscene/report.html': 'bad',
  });
  await assert.rejects(
    composeSite({
      site,
      incoming: invalid,
      component: 'website',
      requireWebsite: true,
    }),
    /must not own/,
  );
  const linked = await payload('linked', { 'index.html': 'bad' });
  await symlink(initial, path.join(linked, 'external'));
  await assert.rejects(
    composeSite({
      site,
      incoming: linked,
      component: 'midscene',
      requireWebsite: true,
    }),
    /Unsupported/,
  );
  assert.equal(
    await readFile(path.join(site, 'index.html'), 'utf8'),
    'original',
  );
});

test('forks can publish a report-only site under the same /midscene/ prefix', async (t) => {
  const { site, payload } = await fixture(t);
  const incoming = await payload('report', { 'index.html': 'report' });
  assert.equal(
    await composeSite({
      site,
      incoming,
      component: 'midscene',
      requireWebsite: false,
    }),
    true,
  );
  assert.match(
    await readFile(path.join(site, 'index.html'), 'utf8'),
    /href="midscene\/"/,
  );
});
