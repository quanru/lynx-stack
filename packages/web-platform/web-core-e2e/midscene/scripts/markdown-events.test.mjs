import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import YAML from 'yaml';
import { originalMarkdownEvents } from './markdown-event-source.mjs';

test('markdown event translation replays the complete original callback with exactly two visual clicks', async () => {
  const original = await originalMarkdownEvents();
  const document = YAML.parse(
    readFileSync(
      new URL('../cases/web-elements/markdown-events.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(document.cases, [original]);
  assert.ok(document.afterEach[0].recordToReport);
  assert.equal(original.steps.filter(step => step.aiAct).length, 2);
  assert.equal(
    original.steps.filter(step => step.javascript?.includes('structuredClone'))
      .length,
    2,
  );
  assert.equal(
    original.steps.filter(step => step.javascript?.startsWith('if (')).length,
    5,
  );
});

test('markdown exact payload checks reject wrong URLs, content and content IDs without trimming', async () => {
  const original = await originalMarkdownEvents();
  function replay(defect) {
    const window = {
      _bindlink_detail: {
        url: 'https://example.com',
        content: 'link',
        contentId: 'case-1',
        ...(defect?.link ?? {}),
      },
      _bindimage_detail: {
        url: 'http://localhost:3081/tests/fixtures/resources/firefox-logo.png',
        contentId: 'case-1',
        ...(defect?.image ?? {}),
      },
    };
    const context = vm.createContext({ window, structuredClone });
    for (const step of original.steps) {
      if (
        step.javascript?.includes('structuredClone')
        || step.javascript?.startsWith('if (')
      ) vm.runInContext(step.javascript, context);
    }
  }
  replay();
  for (
    const defect of [
      { link: { url: 'https://example.com/' } },
      { link: { content: 'link ' } },
      { link: { contentId: 'case-2' } },
      { image: { url: '/wrong.png' } },
      { image: { contentId: 'case-2' } },
    ]
  ) assert.throws(() => replay(defect), /Original markdown/);
});
