// Keep console occurrence checks in the Node-side Page event stream, as in the
// original tests. Page console monkey-patching would miss worker messages.
export function createConsoleEvidence() {
  const seen = new Set<string>();
  let overflow = false;
  let characters = 0;
  return {
    record(text: string) {
      if (seen.has(text)) return;
      if (seen.size >= 4096 || characters + text.length > 2 * 1024 * 1024) {
        overflow = true;
        return;
      }
      seen.add(text);
      characters += text.length;
    },
    expectTexts(texts: string[]) {
      if (
        !Array.isArray(texts) || !texts.length
        || texts.some(text => typeof text !== 'string')
      ) {
        throw new Error('Console contract requires exact message strings.');
      }
      if (overflow) {
        throw new Error(
          'Console evidence exceeded its bound; refusing partial evidence.',
        );
      }
      for (const text of texts) {
        if (!seen.has(text)) {
          throw new Error(
            'Expected exact console message was not observed: '
              + JSON.stringify(text),
          );
        }
      }
    },
  };
}

export interface RuntimeExpectInput {
  consoleTexts?: string[];
  workerCountAtMost?: number;
}

export function expectWebRuntime(
  input: RuntimeExpectInput,
  evidence: ReturnType<typeof createConsoleEvidence>,
  workers: () => number,
) {
  if (Object.keys(input).length !== 1) {
    throw new Error('Runtime assertion requires exactly one contract.');
  }
  if (input.consoleTexts !== undefined) {
    return evidence.expectTexts(input.consoleTexts);
  }
  if (
    input.workerCountAtMost === undefined
    || !Number.isInteger(input.workerCountAtMost) || input.workerCountAtMost < 0
  ) {
    throw new Error(
      'Worker contract requires a nonnegative integer upper bound.',
    );
  }
  // Original expect(page.workers().length).toBeLessThanOrEqual is immediate.
  const actual = workers();
  if (actual > input.workerCountAtMost) {
    throw new Error(
      `Expected at most ${input.workerCountAtMost} workers, got ${actual}`,
    );
  }
}
