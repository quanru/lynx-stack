import ts from 'typescript';

// Deliberately small static evaluator for reviewed browser/render guards.
// Unknown expressions fail closed; event-handler returns are not test returns.
function value(node, source, browserName, isSSR) {
  if (ts.isParenthesizedExpression(node)) {
    return value(node.expression, source, browserName, isSSR);
  }
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isIdentifier(node)) {
    if (node.text === 'browserName') return browserName;
    if (node.text === 'isSSR') return isSSR;
  }
  if (
    ts.isPrefixUnaryExpression(node)
    && node.operator === ts.SyntaxKind.ExclamationToken
  ) return !value(node.operand, source, browserName, isSSR);
  if (ts.isBinaryExpression(node)) {
    const left = value(node.left, source, browserName, isSSR);
    const right = value(node.right, source, browserName, isSSR);
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

export function sourceGuardPolicy(callback, source) {
  const guards = [];
  function visit(node) {
    if (node !== callback && ts.isFunctionLike(node)) return;
    const skip = ts.isCallExpression(node)
      && ['test.skip', 'test.fixme'].includes(node.expression.getText(source));
    if (skip || ts.isReturnStatement(node)) {
      const conditions = [];
      let child = node, parent = node.parent;
      while (parent && parent !== callback) {
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
    ts.forEachChild(node, visit);
  }
  visit(callback);
  const output = { skipBrowsersByMode: {}, earlyReturnBrowsersByMode: {} };
  for (const mode of ['CSR', 'SSR']) {
    const skipped = [], returned = [];
    for (const browser of ['chromium', 'firefox', 'webkit']) {
      for (const guard of guards) {
        if (
          !guard.conditions.every(({ expression, negate }) =>
            Boolean(value(expression, source, browser, mode === 'SSR'))
              !== negate
          )
        ) continue;
        if (
          guard.condition
          && !value(guard.condition, source, browser, mode === 'SSR')
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
