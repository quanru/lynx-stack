import { mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { originalRunnerCatalog } from './original-runner-catalog.mjs';
import { writeRetainedInputEvidence } from './write-retained-input-evidence.mjs';

// Called once on the producer after the six unchanged test invocations. Every
// outcome is explicit; a step skipped after an earlier failure is not a pass.
export function writeOriginalRunnerEvidence(webPlatformRoot, outcomes) {
  if (
    Object.keys(outcomes).sort().join()
      !== originalRunnerCatalog.map(item => item.id).sort().join()
  ) {
    throw new Error('Original runner outcomes must match the complete catalog');
  }
  let exitCode = 0;
  for (const catalog of originalRunnerCatalog) {
    const root = path.join(
      webPlatformRoot,
      catalog.package,
      'midscene-original-results',
      catalog.id,
    );
    mkdirSync(root, { recursive: true });
    const result = writeRetainedInputEvidence(
      realpathSync(root),
      outcomes[catalog.id],
      catalog,
    );
    exitCode ||= result.exitCode;
  }
  return exitCode;
}
if (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  process.exitCode = writeOriginalRunnerEvidence(
    root,
    JSON.parse(process.env.ORIGINAL_RUNNER_OUTCOMES ?? '{}'),
  );
}
