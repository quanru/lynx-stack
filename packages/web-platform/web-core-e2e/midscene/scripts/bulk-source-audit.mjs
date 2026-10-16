import ts from 'typescript';

export function singleThreadMiddlewareBindings(source) {
  const declaration = source.statements.flatMap(statement =>
    ts.isVariableStatement(statement)
      ? [...statement.declarationList.declarations]
      : []
  ).filter(item => item.name.getText(source) === 'ENABLE_MULTI_THREAD');
  if (
    declaration.length !== 1
    || declaration[0].initializer?.getText(source)
      !== '!!process.env[\'ENABLE_MULTI_THREAD\']'
  ) {
    throw new Error('Unreviewed middleware multi-thread binding');
  }
  return { ENABLE_MULTI_THREAD: false };
}

// Deliberately small static evaluator for reviewed browser/render guards.
// Unknown expressions fail closed; event-handler returns are not test returns.
function value(node, source, browserName, isSSR, bindings) {
  if (ts.isParenthesizedExpression(node)) {
    return value(node.expression, source, browserName, isSSR, bindings);
  }
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isIdentifier(node)) {
    if (node.text === 'browserName') return browserName;
    if (node.text === 'isSSR') return isSSR;
    if (Object.hasOwn(bindings, node.text)) return bindings[node.text];
  }
  if (
    ts.isPrefixUnaryExpression(node)
    && node.operator === ts.SyntaxKind.ExclamationToken
  ) return !value(node.operand, source, browserName, isSSR, bindings);
  if (ts.isBinaryExpression(node)) {
    const left = value(node.left, source, browserName, isSSR, bindings);
    const right = value(node.right, source, browserName, isSSR, bindings);
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.EqualsEqualsToken:
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        return left === right;
      case ts.SyntaxKind.ExclamationEqualsToken:
      case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        return left !== right;
      case ts.SyntaxKind.BarBarToken:
        return left || right;
      case ts.SyntaxKind.AmpersandAmpersandToken:
        return left && right;
    }
  }
  throw new Error('Unreviewed source guard: ' + node.getText(source));
}

export function sourceGuardPolicy(callback, source, bindings = {}) {
  if (
    Object.entries(bindings).some(([key, value]) =>
      ['browserName', 'isSSR'].includes(key) || typeof value !== 'boolean'
    )
  ) throw new Error('Invalid reviewed source guard binding');
  const guards = [];
  function visit(node, scope = callback, includeReturns = true) {
    if (node !== scope && ts.isFunctionLike(node)) return;
    const skip = ts.isCallExpression(node)
      && ['test.skip', 'test.fixme'].includes(node.expression.getText(source))
      && !(node.arguments[0] && ts.isStringLiteral(node.arguments[0])
        && node.arguments.at(-1) && ts.isFunctionLike(node.arguments.at(-1)));
    if (skip || (includeReturns && ts.isReturnStatement(node))) {
      const conditions = [];
      let child = node, parent = node.parent;
      while (parent && parent !== scope) {
        if (ts.isIfStatement(parent)) {
          conditions.push({
            expression: parent.expression,
            negate: child === parent.elseStatement,
          });
        }
        child = parent;
        parent = parent.parent;
      }
      guards.push({
        kind: skip ? 'skip' : 'return',
        conditions,
        condition: skip ? node.arguments[0] : undefined,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line
          + 1,
        text: node.getText(source),
      });
    }
    ts.forEachChild(node, child => visit(child, scope, includeReturns));
  }
  // Describe modifiers apply before a test callback, including nested suites.
  // Scan only each ancestor's own registration body: sibling test callbacks and
  // sibling describe callbacks must never grant exemptions to this declaration.
  const ancestors = [];
  for (let parent = callback.parent; parent; parent = parent.parent) {
    if (
      ts.isFunctionLike(parent) && ts.isCallExpression(parent.parent)
      && parent.parent.expression.getText(source) === 'test.describe'
    ) {
      ancestors.unshift(parent);
    }
  }
  for (const ancestor of ancestors) visit(ancestor, ancestor, false);
  visit(callback);
  const output = { skipBrowsersByMode: {}, earlyReturnBrowsersByMode: {} };
  for (const mode of ['CSR', 'SSR']) {
    const skipped = [], returned = [];
    for (const browser of ['chromium', 'firefox', 'webkit']) {
      for (const guard of guards) {
        if (
          !guard.conditions.every(({ expression, negate }) =>
            Boolean(
              value(expression, source, browser, mode === 'SSR', bindings),
            )
              !== negate
          )
        ) continue;
        if (
          guard.condition
          && !value(guard.condition, source, browser, mode === 'SSR', bindings)
        ) continue;
        (guard.kind === 'skip' ? skipped : returned).push(browser);
        // Source guards occur in statement order; a skip terminates the callback.
        break;
      }
    }
    output.skipBrowsersByMode[mode] = skipped;
    output.earlyReturnBrowsersByMode[mode] = returned;
  }
  return {
    ...output,
    guardEvidence: guards.map(({ kind, line, text }) => ({ kind, line, text })),
  };
}
