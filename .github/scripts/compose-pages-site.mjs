import { cp, lstat, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Both producers hold the same Actions concurrency lock while composing,
// archiving, and deploying. Never publish a report-only site over the website.
export async function composeSite(
  { site, incoming, component, requireWebsite },
) {
  if (!['website', 'midscene'].includes(component)) {
    throw new Error(`Unknown Pages component: ${component}`);
  }
  async function validate(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name === '.git') {
        throw new Error(`Unsupported Pages entry: ${entry.name}`);
      }
      if (entry.isDirectory()) await validate(path.join(directory, entry.name));
    }
  }
  await validate(incoming);
  await mkdir(site, { recursive: true });
  if (component === 'website') {
    const entries = await readdir(incoming);
    if (entries.includes('midscene') || !entries.includes('index.html')) {
      throw new Error(
        'Website must contain index.html and must not own /midscene/.',
      );
    }
    for (const name of await readdir(site)) {
      if (name !== '.git' && name !== 'midscene') {
        await rm(path.join(site, name), { recursive: true, force: true });
      }
    }
    for (const name of entries) {
      await cp(path.join(incoming, name), path.join(site, name), {
        recursive: true,
      });
    }
  } else {
    // Each artifact contains one immutable run path. Merge it with the archive
    // so older Summary screenshots and exact-step URLs remain available.
    await cp(incoming, path.join(site, 'midscene'), { recursive: true });
  }
  const hasWebsite = await lstat(path.join(site, 'index.html'))
    .then((stat) => stat.isFile(), () => false);
  if (!hasWebsite && !requireWebsite) {
    await writeFile(
      path.join(site, 'index.html'),
      '<!doctype html><meta charset="utf-8"><title>Midscene reports</title><a href="midscene/">Open Midscene reports</a>',
    );
  }
  return hasWebsite || !requireWebsite;
}

if (
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [site, incoming, component, repository] = process.argv.slice(2);
  const upstream = process.env.MIDSCENE_UPSTREAM_REPOSITORY;
  if (!upstream?.trim() || !repository?.trim()) {
    throw new Error('MIDSCENE_UPSTREAM_REPOSITORY and repository are required');
  }
  const ready = await composeSite({
    site,
    incoming,
    component,
    requireWebsite: repository === upstream,
  });
  console.log(`ready=${ready}`);
}
