// Keep console occurrence checks in the Node-side Page event stream, as in the
// original tests. Page console monkey-patching would miss worker messages.
import type { ConsoleMessage } from 'playwright';

export function projectConsoleError(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const event = value as {
    type?: unknown;
    detail?: {
      error?: { message?: unknown; stack?: unknown };
      sourceMap?: { offset?: { line?: unknown; col?: unknown } };
      fileName?: unknown;
      release?: unknown;
    };
  };
  if (event.type !== 'error') return null;
  return {
    type: event.type,
    message: event.detail?.error?.message,
    stack: event.detail?.error?.stack,
    line: event.detail?.sourceMap?.offset?.line,
    col: event.detail?.sourceMap?.offset?.col,
    fileName: event.detail?.fileName,
    release: event.detail?.release,
  };
}

type ErrorEvent = NonNullable<ReturnType<typeof projectConsoleError>>;
type ErrorContract = Record<string, string | number | { nonemptyString: true }>;

export function createConsoleEvidence() {
  const seen = new Set<string>();
  let overflow = false;
  let characters = 0;
  const errors: ErrorEvent[] = [];
  let extractionFailed = false;
  return {
    recordError(event: ErrorEvent | null) {
      if (!event) return;
      const size = JSON.stringify(event).length;
      if (errors.length >= 4096 || characters + size > 2 * 1024 * 1024) {
        overflow = true;
        return;
      }
      errors.push(event);
      characters += size;
    },
    recordExtractionFailure() {
      extractionFailed = true;
    },
    expectError(contract: ErrorContract) {
      const allowed = [
        'type',
        'message',
        'stack',
        'line',
        'col',
        'fileName',
        'release',
      ];
      if (
        !contract || typeof contract !== 'object' || Array.isArray(contract)
        || contract.type !== 'error'
        || Object.entries(contract).some(([field, value]) =>
          !allowed.includes(field)
          || !(typeof value === 'string'
            || (typeof value === 'number' && Number.isFinite(value))
            || (value && typeof value === 'object'
              && Object.keys(value).length === 1
              && value.nonemptyString === true))
        )
      ) {
        throw new Error('Invalid original console error contract.');
      }
      if (overflow || extractionFailed) {
        throw new Error('Console error evidence is incomplete.');
      }
      if (
        !errors.some(event =>
          Object.entries(contract).every(([field, expected]) => {
            const actual = event[field as keyof ErrorEvent];
            return typeof expected === 'object'
              ? typeof actual === 'string' && actual !== ''
              : actual === expected;
          })
        )
      ) {
        throw new Error(
          'Original exact console error contract was not observed.',
        );
      }
    },
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
  consoleError?: ErrorContract;
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
  if (input.consoleError !== undefined) {
    return evidence.expectError(input.consoleError);
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

// Complete only callbacks that actually finish before the assertion. Waiting
// for pending extraction in expectError would extend the original 500 ms window.
export async function captureConsoleMessage(
  message: Pick<ConsoleMessage, 'text' | 'args'>,
  evidence: ReturnType<typeof createConsoleEvidence>,
) {
  evidence.record(message.text());
  try {
    const arg = message.args()[0];
    if (arg) evidence.recordError(await arg.evaluate(projectConsoleError));
  } catch {
    evidence.recordExtractionFailure();
  }
}
