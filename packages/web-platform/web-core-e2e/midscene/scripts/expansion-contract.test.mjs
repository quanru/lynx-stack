import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { collectWorkflowDocument } from '@midscene/test';
import { loadTestProject } from '@midscene/test/config';
import { fileURLToPath } from 'node:url';

for (
  const [file, count, suite = 'web', sourceFile = 'reactlynx.spec.ts'] of [
    ['expansion', 85],
    ['continuation', 15],
    ['contracts', 7, 'web-elements'],
    ['attributes', 18, 'web-elements'],
    ['css-fallback', 2, 'web', 'reactlynx-css-var-fallback.spec.ts'],
    ['frame-sizing', 2],
    ['text-count', 4],
    ['middleware', 1, 'web', 'middleware.spec.ts'],
    ['directory-bundles', 2],
    ['directory-interactions', 1],
    ['reentrant-lazy', 1],
    ['properties', 1],
    ['relative-coordinates', 3],
    ['relative-coordinate-tap', 1],
    ['error-display', 1],
    ['remaining-inputs', 1],
  ]
) {
  test(`${count} ${file} migrations retain original assertion counts, values, CSS order, and clicks`, async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const loaded = await loadTestProject(root + '/midscene.config.ts');
    const project = loaded.projects.find(item =>
      item.name
        === (suite === 'web' ? 'web-shell' : 'web-elements')
    );
    const document = collectWorkflowDocument({
      projectId: project.projectId,
      projectName: project.name,
      sourcePath: `cases/${suite}/${file}.yaml`,
      absolutePath: root + `/cases/${suite}/${file}.yaml`,
    }, {
      resolveNode: project.nodes.get.bind(project.nodes),
      variables: project.variables,
      env: process.env,
    });
    const source = readFileSync(
      new URL(
        suite === 'web'
          ? '../../tests/' + sourceFile
          : '../../../web-elements/tests/web-elements.spec.ts',
        import.meta.url,
      ),
      'utf8',
    );
    const ast = ts.createSourceFile(
      'reactlynx.spec.ts',
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const originals = new Map();
    function visit(node, group = '') {
      if (
        ts.isCallExpression(node)
        && node.expression.getText(ast) === 'test.describe'
        && ts.isStringLiteral(node.arguments[0])
      ) {
        group = node.arguments[0].text;
      }
      if (
        ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
        && ts.isStringLiteral(node.arguments[0])
      ) {
        const title = node.arguments[0].text;
        const key = suite === 'web-elements' && !title.includes('/')
          ? group + '/' + title
          : title;
        originals.set(key, node);
      }
      ts.forEachChild(node, child => visit(child, group));
    }
    visit(ast);
    assert.equal(document.cases.length, count);
    const cases = document.cases.map(({ definition }) => ({
      name: definition.name,
      steps: definition.steps.map(step => ({ [step.node]: step.input })),
    }));
    for (const item of cases) {
      const lazyToggleCases = [
        'basic-lazy-component',
        'basic-lazy-component-relative-path',
        'basic-lazy-component-multi',
        'basic-lazy-component-multi-import',
        'basic-lazy-component-when-needed',
      ];
      if (lazyToggleCases.includes(item.name)) {
        const actions = item.steps.filter(step => step.aiAct).map(step =>
          step.aiAct.prompt
        );
        const toggles = actions.slice(-2);
        assert.equal(toggles.length, 2);
        for (const prompt of toggles) {
          assert.match(prompt, /BLUE.*RIGHT/);
          assert.match(prompt, /Stop after (?:that single|one) click/);
          assert.doesNotMatch(prompt, /\b\d+\s*(?:px|pixels)\b|#[\w-]+/);
        }
        if (item.name.includes('multi')) {
          assert.match(toggles[0], /upper half/);
          assert.match(toggles[1], /lower half/);
          const finalWait = item.steps.at(-1).aiWaitFor.prompt;
          assert.match(finalWait, /continuous pink column on the left/);
          assert.match(finalWait, /upper and lower halves/);
          assert.doesNotMatch(finalWait, /two pink squares/i);
        } else {
          assert.match(toggles[0], /LEFT green neighbor pink/);
          assert.match(toggles[1], /LEFT pink neighbor green/);
        }
      }
      const originalName = item.name.replace(
        /^(?:web-elements|middleware)\//,
        '',
      );
      const original = originals.get(originalName);
      assert.ok(
        original,
        item.name + ' must be an original test, not a split or invented case',
      );
      const body = original.getText(ast);
      if (item.name === 'api-animation-event') {
        for (const action of item.steps.filter(step => step.aiAct)) {
          assert.deepEqual(action.aiAct.options, {
            deepLocate: true,
            cacheable: false,
          });
        }
        const actions = item.steps.filter(step => step.aiAct).map(step =>
          step.aiAct.prompt
        );
        assert.equal(actions.length, 4);
        for (
          const [index, label] of [
            'toggle transition 1',
            'toggle animation 1',
            'toggle transition 2',
            'toggle animation 2',
          ].entries()
        ) {
          assert.ok(
            actions[index].includes(
              'CENTER of the visible words "' + label + '"',
            ),
          );
          assert.match(
            actions[index],
            /Stay inside the words, not at their left edge/,
          );
          assert.match(actions[index], /Stop after that single click/);
          assert.doesNotMatch(
            actions[index],
            /\b\d+\s*(?:px|pixels)\b|#[\w-]+/,
          );
        }
      }
      if (file === 'remaining-inputs') {
        assert.match(body, /locator\('input'\)\.press\('Enter'\)/);
        assert.match(body, /locator\('input'\)\.fill\('foobar'\)/);
        const actions = item.steps.filter(step => step.aiAct);
        assert.equal(actions.length, 1);
        assert.match(actions[0].aiAct.prompt, /press Enter/);
        assert.match(
          actions[0].aiAct.prompt,
          /literal string "foobar" exactly once/,
        );
      }
      if (file.startsWith('relative-coordinate')) {
        const transformed = item.name.endsWith('-transformed');
        assert.deepEqual(item.steps[0], {
          'web.prepareLynxView': {
            style: transformed ? 'transform' : 'offset',
          },
        });
        assert.match(body, /await installLynxViewStyle\(page,/);
        assert.ok(
          body.indexOf('installLynxViewStyle') < body.indexOf('await goto'),
        );
        assert.match(
          body,
          transformed
            ? /installLynxViewStyle\(page, 'transform: translate\(200px, 200px\);'\)/
            : /installLynxViewStyle\(page, offsetCss\)/,
        );
        assert.match(
          source,
          /const offsetCss = 'margin-top: 200px; margin-left: 200px;'/,
        );
        assert.equal(
          item.steps[1].gotoUrl.url,
          project.variables.shellUrl + '?casename='
            + (transformed
              ? 'api-bindlayoutchange-lynx-view-relative'
              : item.name),
        );
        if (transformed) {
          assert.match(
            body,
            /goto\(page, 'api-bindlayoutchange-lynx-view-relative'\)/,
          );
        }
      }
      if (file === 'reentrant-lazy') {
        const actions = item.steps.filter(step => step.aiAct).map(step =>
          step.aiAct.prompt
        );
        assert.equal(actions.length, 4);
        for (const index of [0, 2]) {
          assert.match(actions[index], /RED square with no visible text/);
        }
        assert.match(actions[1], /BLUE.*RIGHT.*upper row ABOVE/);
        assert.match(actions[3], /BLUE.*RIGHT.*lower row BELOW/);
        for (const prompt of actions) {
          assert.match(prompt, /Stop after that single click/);
          assert.doesNotMatch(prompt, /labelled|Load Component/);
          assert.doesNotMatch(prompt, /\b\d+\s*(?:px|pixels)\b|#[\w-]+/);
        }
      }
      if (file.startsWith('directory-')) {
        assert.match(body, /goto\(page, title, undefined, true\)/);
        assert.equal(
          item.steps[0].gotoUrl.url,
          project.variables.shellUrl + '?casename=' + item.name
            + '&hasdir=true',
        );
        assert.match(source, /if \(hasDir\) \{\s*url \+= '&hasdir=true'/);
        assert.match(body, /test\.(?:skip|fixme)\(isSSR/);
        for (
          const step of item.steps.filter(step => step['web.expect']?.attribute)
        ) {
          assert.equal(step['web.expect'].immediate, true);
        }
      }
      if (file === 'middleware') {
        assert.match(source, /test\.skip\(ENABLE_MULTI_THREAD \|\| isSSR/);
        assert.match(source, /test\.skip\(browserName !== 'chromium'/);
        assert.match(
          source,
          /middleware\?casename=\/dist\/\$\{testname\}\.web\.bundle/,
        );
        assert.equal(
          item.steps[0].gotoUrl.url,
          project.variables.shellUrl
            + 'middleware?casename=/dist/basic-bindtap.web.bundle',
        );
        for (const check of item.steps.filter(step => step['web.expect'])) {
          assert.equal(
            check['web.expect'].immediate,
            true,
            'original getAttribute is a single read, not an eventual assertion',
          );
        }
      }
      if (item.name === 'basic-element-x-textarea-input-filter') {
        assert.match(body, /locator\('textarea'\)\.press\('Enter'\)/);
        assert.match(body, /locator\('textarea'\)\.fill\('foobar!@#\)'\)/);
        const actions = item.steps.filter(step => step.aiAct);
        assert.equal(actions.length, 1);
        const prompt = actions[0].aiAct.prompt;
        assert.match(prompt, /press Enter/);
        assert.match(prompt, /literal string "foobar!@#\)" exactly once/);
        assert.match(prompt, /Enter every character including punctuation/);
        assert.match(
          prompt,
          /completion means sending that input, not retaining the unfiltered text/,
        );
        assert.match(prompt, /do not retry or correct the filtered result/);
        const fixture = readFileSync(
          new URL(
            '../../tests/reactlynx/basic-element-x-textarea-input-filter/index.jsx',
            import.meta.url,
          ),
          'utf8',
        );
        assert.ok(fixture.includes('input-filter=\'[^a-zA-Z0-9]\''));
      }
      assert.doesNotMatch(
        body,
        /diffScreenShot|toMatchSnapshot|test\.skip\(true|addInitScript|page\.evaluate/,
      );
      const assertions = [];
      const variables = new Map();
      function locatorSpec(node) {
        if (
          ts.isAwaitExpression(node) || ts.isParenthesizedExpression(node)
          || ts.isNonNullExpression(node)
        ) return locatorSpec(node.expression);
        if (ts.isIdentifier(node)) return variables.get(node.text);
        if (ts.isPropertyAccessExpression(node)) {
          if (['height', 'width'].includes(node.name.text)) {
            return { ...locatorSpec(node.expression), bounds: node.name.text };
          }
          return locatorSpec(node.expression);
        }
        if (
          ts.isCallExpression(node)
          && ts.isPropertyAccessExpression(node.expression)
        ) {
          if (node.expression.name.text === 'locator') {
            return { selector: node.arguments[0].text, index: 0 };
          }
          const result = locatorSpec(node.expression.expression);
          if (result && node.expression.name.text === 'getAttribute') {
            return { ...result, attribute: node.arguments[0].text };
          }
          if (result && node.expression.name.text === 'nth') {
            return { ...result, index: Number(node.arguments[0].getText(ast)) };
          }
          return result;
        }
        return undefined;
      }
      function scan(node) {
        if (
          ts.isCallExpression(node)
          && ['expectHasText', 'expectNoText'].includes(
            node.expression.getText(ast),
          )
        ) {
          assert.ok(ts.isStringLiteral(node.arguments[1]));
          assertions.push({
            matcher: 'textCount',
            args: [
              node.arguments[1].text,
              node.expression.getText(ast) === 'expectHasText' ? '1' : '0',
            ],
          });
        }
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const spec = locatorSpec(node.initializer);
          if (spec) variables.set(node.name.getText(ast), spec);
        }
        if (
          ts.isCallExpression(node)
          && ts.isPropertyAccessExpression(node.expression)
        ) {
          const matcher = node.expression.name.text;
          if (
            [
              'toHaveCSS',
              'toHaveJSProperty',
              'toHaveText',
              'toContainText',
              'toContain',
              'toHaveAttribute',
              'toBe',
              'toEqual',
              'toStrictEqual',
              'toBeGreaterThan',
            ].includes(matcher)
          ) {
            let expectation = node.expression.expression;
            if (
              ts.isPropertyAccessExpression(expectation)
              && expectation.name.text === 'not'
            ) expectation = expectation.expression;
            assert.ok(
              ts.isCallExpression(expectation)
                && expectation.expression.getText(ast) === 'expect',
              item.name,
            );
            assertions.push({
              locator: locatorSpec(expectation.arguments[0]),
              matcher,
              args: node.arguments.map(arg =>
                ts.isStringLiteral(arg) ? arg.text : arg.getText(ast)
              ),
              not: node.expression.expression.getText(ast).endsWith('.not'),
            });
          }
        }
        ts.forEachChild(node, scan);
      }
      scan(original);
      const checks = item.steps.filter(step => step['web.expect']).map(step =>
        step['web.expect']
      );
      assert.equal(
        checks.length,
        assertions.length,
        item.name + ' assertion count',
      );
      for (let i = 0; i < checks.length; i++) {
        const check = checks[i];
        const originalCheck = assertions[i];
        if (originalCheck.matcher === 'textCount') {
          assert.deepEqual(check, {
            matchingText: originalCheck.args[0],
            count: Number(originalCheck.args[1]),
          });
          continue;
        }
        assert.deepEqual(
          { selector: check.selector, index: check.index ?? 0 },
          {
            selector: originalCheck.locator?.selector,
            index: originalCheck.locator?.index,
          },
          item.name + ' original assertion target',
        );
        const expected = check.text ?? check.textContains ?? check.value
          ?? check.equals ?? check.contains;
        if (originalCheck.matcher === 'toHaveCSS') {
          assert.deepEqual([check.css, expected, check.not ?? false], [
            ...originalCheck.args,
            originalCheck.not,
          ], item.name);
        } else if (originalCheck.matcher === 'toHaveJSProperty') {
          assert.deepEqual(
            [check.property, expected],
            originalCheck.args,
            item.name,
          );
        } else if (originalCheck.matcher === 'toHaveAttribute') {
          assert.equal(check.attribute, originalCheck.args[0], item.name);
          assert.equal(
            check.contains !== undefined
              ? '/' + check.contains + '/g'
              : check.equals,
            originalCheck.args[1],
            item.name,
          );
          assert.equal(check.not ?? false, originalCheck.not, item.name);
        } else if (originalCheck.matcher === 'toBeGreaterThan') {
          assert.equal(check.bounds, originalCheck.locator.bounds, item.name);
          assert.equal(
            check.greaterThan,
            Number(originalCheck.args[0]),
            item.name,
          );
          assert.equal(
            check.immediate,
            true,
            item.name + ' must not turn a single read into polling',
          );
        } else {
          if (originalCheck.locator?.attribute) {
            assert.equal(
              check.attribute,
              originalCheck.locator.attribute,
              item.name,
            );
          }
          assert.equal(String(expected), originalCheck.args[0], item.name);
        }
      }
      const clicks = (body.match(/\.click\(/g) ?? []).length;
      if (clicks) {
        assert.equal(
          item.steps.filter(step => step.aiAct).length,
          clicks,
          item.name + ' click count',
        );
      }
      assert.ok(
        item.steps.some(step =>
          step.aiWaitFor || step.aiAct || step.recordToReport
        ),
        item.name + ' report evidence',
      );
      const firstCheck = item.steps.findIndex(step => step['web.expect']);
      assert.ok(
        item.steps.slice(1, firstCheck < 0 ? undefined : firstCheck).some(
          step => step.aiWaitFor || step.aiAct || step.recordToReport,
        ),
        item.name
          + ' must create visual evidence before exact assertions can fail',
      );
      assert.ok(
        item.steps.every(step =>
          [
            'gotoUrl',
            'aiWaitFor',
            'aiAct',
            'web.expect',
            'recordToReport',
            ...(file.startsWith('relative-coordinate')
              ? ['web.prepareLynxView']
              : []),
            ...(suite === 'web-elements'
                || [
                  'css-fallback',
                  'text-count',
                  'middleware',
                  'directory-bundles',
                  'directory-interactions',
                ].includes(file)
              ? ['javascript']
              : []),
          ]
            .includes(
              Object.keys(step)[0],
            )
        ),
        item.name + ' supported nodes',
      );
      if (
        suite === 'web-elements'
        || file === 'directory-interactions'
        || ['css-fallback', 'text-count', 'middleware', 'directory-bundles']
          .includes(file)
      ) {
        const javascriptSteps = item.steps.filter(step => step.javascript);
        assert.equal(javascriptSteps.length, 1);
        assert.equal(
          javascriptSteps[0].javascript.script,
          'document.fonts.ready.then(() => true)',
        );
        assert.equal(item.steps[1], javascriptSteps[0]);
        assert.equal(
          item.steps[0].gotoUrl.url,
          suite === 'web-elements'
            ? project.variables.elementsUrl + 'tests/fixtures/'
              + item.name.replace(/^web-elements\//, '') + '.html'
            : file === 'middleware'
            ? project.variables.shellUrl
              + 'middleware?casename=/dist/basic-bindtap.web.bundle'
            : project.variables.shellUrl + '?casename=' + item.name
              + (file.startsWith('directory-') ? '&hasdir=true' : ''),
        );
      }
    }
  });
}
