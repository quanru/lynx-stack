import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('SSR loads the same production client as a module, matching the existing CSR loader', () => {
  const template = readFileSync(
    new URL('../../shell-project/ssr.html', import.meta.url),
    'utf8',
  );
  const source =
    '/node_modules/@lynx-js/web-core/dist/client_prod/static/js/client.js';
  const script = template.match(/<script\b[^>]*\bsrc="[^"]*client\.js"[^>]*>/)
    ?.[0];
  assert.ok(script?.includes(`src="${source}"`));
  assert.match(script, /\btype="module"/);
  const csr = readFileSync(
    new URL('../../rsbuild.config.ts', import.meta.url),
    'utf8',
  );
  assert.ok(csr.includes('type: \'module\''));
  assert.ok(csr.includes(source));
  const middleware = readFileSync(
    new URL('../../shell-project/devMiddleware.ts', import.meta.url),
    'utf8',
  );
  assert.ok(
    middleware.includes('`/dist/ssr/${'),
    'The original public SSR URL attribute must remain unchanged',
  );
  assert.ok(
    middleware.includes('url.pathname.replace(\'/dist/ssr/\', \'/dist/\')'),
    'SSR hydration must serve the existing client bundle',
  );
});
