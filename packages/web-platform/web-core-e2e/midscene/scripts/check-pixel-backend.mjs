// Model-free differential against the unchanged public Playwright matcher.
// Synthetic baselines and all matcher writes live only in an owned temp folder.
// This is backend conformance, not acceptance of Linux repository baselines.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(join(tmpdir(), 'lynx-pixel-backend-'));
try {
  const cwd = join(directory, 'midscene');
  await mkdir(cwd);
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  const adapter = fileURLToPath(new URL('../web-pixels.ts', import.meta.url));
  await writeFile(
    join(directory, 'playwright.config.mjs'),
    `export default {
    testDir: ${JSON.stringify(directory)}, testMatch: 'backend.spec.ts',
    snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
    outputDir: ${JSON.stringify(join(directory, 'results'))},
    workers: 1, retries: 0, use: { viewport: { width: 32, height: 32 } }
  };`,
  );
  await writeFile(
    join(directory, 'backend.spec.ts'),
    `
    import playwrightTest from ${
      JSON.stringify(require.resolve('playwright/test'))
    };
    const { test, expect } = playwrightTest;
    import { expectWebPixels, pixelOptions } from ${JSON.stringify(adapter)};
    import { mkdir, writeFile, readFile } from 'node:fs/promises';
    import assert from 'node:assert/strict';
    import { resolve } from 'node:path';
    test('unchanged public matcher and adapter agree on synthetic pass and failure', async ({ page }) => {
      process.chdir(${JSON.stringify(cwd)});
      await page.setContent('<style>html,body{margin:0;width:32px;height:32px;background:red}</style>');
      const image = await page.screenshot({ fullPage: true, animations: 'allow', caret: 'hide', scale: 'css' });
      const baseline = 'synthetic/solid/index';
      const baselinePath = resolve('../tests/reactlynx.spec.ts-snapshots/' + baseline + '-chromium-linux.png');
      await mkdir(resolve(baselinePath, '..'), { recursive: true });
      await writeFile(baselinePath, image);
      await mkdir(${JSON.stringify(join(directory, 'snapshots'))});
      await writeFile(${
      JSON.stringify(join(directory, 'snapshots/view.png'))
    }, image);
      await expect(page).toHaveScreenshot('view.png', { ...pixelOptions });
      await expectWebPixels(page, baseline, 'pass');
      await page.evaluate(() => document.body.style.background = 'blue');
      let originalError;
      try { await expect(page).toHaveScreenshot('view.png', { ...pixelOptions }); }
      catch (error) { originalError = error; }
      assert.ok(originalError, 'Original public matcher must reject a changed image');
      await assert.rejects(expectWebPixels(page, baseline, 'fail'), /Original Web pixel contract failed/);
      const evidence = resolve('midscene_run/web-pixels/fail/' + baseline);
      assert.deepEqual(await readFile(resolve(evidence, 'expected.png')), image);
      assert.ok((await readFile(resolve(evidence, 'actual.png'))).length);
      assert.ok((await readFile(resolve(evidence, 'diff.png'))).length);
      assert.deepEqual(await readFile(baselinePath), image, 'Do not modify the baseline');
    });
  `,
  );
  const result = spawnSync(process.execPath, [
    resolve(require.resolve('playwright/package.json'), '../cli.js'),
    'test',
    '--config',
    join(directory, 'playwright.config.mjs'),
    '--reporter=line',
  ], { stdio: 'inherit', timeout: 60_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Pixel backend differential failed: ${result.status}`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
