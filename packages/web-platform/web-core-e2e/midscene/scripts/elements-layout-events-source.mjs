import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Keep complete read/assertion tails together: a single event payload must
// satisfy every original check without retries or reads of later events.
export function originalLayoutEvents() {
  const ast = ts.createSourceFile(
    'elements.ts',
    readFileSync(
      new URL(
        '../../../web-elements/tests/web-elements.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const selected = new Map();
  function visit(node, suite) {
    if (
      ts.isCallExpression(node)
      && node.expression.getText(ast) === 'test.describe'
      && ts.isStringLiteral(node.arguments[0])
    ) suite = node.arguments[0].text;
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) {
      const title = node.arguments[0].text;
      const name = title.includes('/') ? title : suite + '/' + title;
      if (
        [
          'x-view/event-layoutchange',
          'x-text/event-layoutchange',
          'scroll-view/scrollable-even-inline-overflow-visible',
          'x-foldview-ng/basic-toolbar-in-lynx-wrapper',
        ].includes(name)
      ) {
        assert.ok(!selected.has(name));
        selected.set(name, node.arguments[1].body);
      }
    }
    ts.forEachChild(node, child => visit(child, suite));
  }
  visit(ast);
  assert.equal(selected.size, 4);
  return [...selected].map(([title, body]) => {
    const statements = [...body.statements];
    const compact = node => node.getText(ast).replace(/\s/g, '');
    const event = title.endsWith('/event-layoutchange');
    if (event) {
      assert.equal(
        compact(statements.shift()),
        'consttitle=getTitle(titlePath);',
      );
    }
    assert.equal(
      compact(statements.shift()),
      'awaitgotoWebComponentPage(page,title);',
    );
    const steps = [{
      gotoUrl: '${elementsUrl}tests/fixtures/' + title + '.html',
    }, { javascript: 'document.fonts.ready.then(() => true)' }];
    if (event) {
      assert.equal(
        compact(statements.shift()),
        'awaitpage.locator(\'#target\').click();',
      );
      steps.push({
        aiAct: {
          prompt:
            'Click once in the center of the visible tall aquamarine rectangle on the left of the page. Do not scroll, drag, or click another element.',
          options: { deepLocate: true, cacheable: false },
        },
      });
    }
    const source = statements.map(statement => statement.getText(ast)).join(
      '\n',
    );
    assert.doesNotMatch(
      source,
      /\.click\(|\.fill\(|\.press\(|\.mouse\.|\.dispatchEvent\(/,
    );
    const tail = ts.transpile(source, { target: ts.ScriptTarget.ES2022 });
    const javascript = `(async () => {
      let pollDeadline;
      const page = {
        evaluate: async fn => structuredClone(fn()),
        locator: selector => ({ evaluate: async fn => {
          const deadline = Date.now() + 30000;
          return new Promise((resolve, reject) => {
            const check = () => {
              if (pollDeadline !== undefined && Date.now() >= pollDeadline) return reject(new Error('Original layout polling assertion failed'));
              const matches = document.querySelectorAll(selector);
              if (matches.length > 1) return reject(new Error('Original layout locator strictness violation'));
              if (matches.length === 1) { try { return resolve(fn(matches[0])); } catch (error) { return reject(error); } }
              if (Date.now() >= deadline) return reject(new Error('Original layout locator attachment timed out'));
              requestAnimationFrame(check);
            }; check();
          });
        } }),
      };
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const expect = actual => ({
        toBe: expected => { if (!Object.is(actual, expected)) throw new Error('Original layout exact assertion failed'); },
        toBeTruthy: () => { if (!actual) throw new Error('Original layout event payload is absent'); },
      });
      expect.poll = fn => ({ toBe: async expected => {
        const deadline = Date.now() + 5000;
        pollDeadline = deadline;
        const intervals = [100, 250, 500, 1000];
        for (let index = 0;; index++) {
          const actual = await fn();
          if (Date.now() >= deadline) throw new Error('Original layout polling assertion failed');
          if (Object.is(actual, expected)) { pollDeadline = undefined; return; }
          const interval = intervals[Math.min(index, intervals.length - 1)];
          if (Date.now() + interval > deadline) throw new Error('Original layout polling assertion failed');
          await wait(interval);
        }
      } });
      ${tail}
      return true;
    })()`;
    steps.push({ javascript });
    return { name: 'web-elements/' + title, steps };
  });
}
