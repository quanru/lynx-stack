import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Count source declarations, not browser/SSR/loop-expanded runtime cases.
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
for (
  const directory of [
    'packages/web-platform/web-core-e2e/tests',
    'packages/web-platform/web-core-e2e/server-tests',
    'packages/web-platform/web-elements/tests',
  ]
) {
  for (const name of (await readdir(resolve(root, directory))).sort()) {
    if (!/\.(test|spec)\.ts$/.test(name)) continue;
    const path = `${directory}/${name}`;
    const source = ts.createSourceFile(
      name,
      await readFile(resolve(root, path), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    let declarations = 0;
    function visit(node) {
      if (
        ts.isCallExpression(node) && node.arguments.length >= 2
        && (ts.isStringLiteralLike(node.arguments[0])
          || ts.isTemplateExpression(node.arguments[0]))
        && ['test', 'test.only', 'test.skip', 'test.fixme'].includes(
          node.expression.getText(source),
        )
      ) {
        declarations++;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    console.log(`${path}: ${declarations} source declarations`);
  }
}
