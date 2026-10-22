import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadTestProject } from '@midscene/test/config';

// Use the real SDK loader: source-only tests cannot catch its serialized
// function helpers or the browser's pre-<html> initialization timing.
const config = await loadTestProject(
  fileURLToPath(new URL('../midscene.config.ts', import.meta.url)),
);
const project = config.projects.find(project => project.name === 'web-shell');
const fixtureNode = project.nodes.get('web.prepareLynxView');
const browser = await chromium.launch({ headless: true });
try {
  for (const style of ['offset', 'transform']) {
    const page = await browser.newPage({
      viewport: { width: 393, height: 851 },
    });
    try {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await fixtureNode.execute({
        scope: 'case',
        case: { runId: `fixture-${style}` },
        input: { style },
        context: { getPage: async () => page },
      });
      await page.goto(
        project.variables.shellUrl
          + '?casename=api-bindlayoutchange-lynx-view-relative',
      );
      await page.locator('#target').waitFor();
      const position = await page.locator('lynx-view').evaluate(view => {
        const rect = view.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
      });
      assert.deepEqual(
        errors,
        [],
        `${style}: initialization must not silently fail`,
      );
      assert.deepEqual(
        position,
        { left: 200, top: 200 },
        `${style}: do not test at viewport origin`,
      );
      console.log(
        `Fixture ${style}: verified actual Lynx view at (200, 200), no page errors`,
      );
    } finally {
      await page.context().close();
    }
  }
} finally {
  await browser.close();
}
