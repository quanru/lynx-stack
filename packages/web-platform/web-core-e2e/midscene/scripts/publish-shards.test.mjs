import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { selectShards } from './publish-shards.mjs';

test('publication selects the latest attempt per shard, including failures and missing shards', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'midscene-shard-artifacts-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const stage = async (
    index,
    attempt,
    result,
    sha = 'current',
    names = [`case-${index}`],
  ) => {
    const path = join(
      directory,
      `midscene-ai-e2e-web-shard-${index}-4-${attempt}`,
      `attempt-${attempt}`,
    );
    await mkdir(path, { recursive: true });
    await writeFile(
      join(path, 'result.json'),
      JSON.stringify({ index, count: 4, attempt, result, sha }),
    );
    await writeFile(
      join(path, 'shard.json'),
      JSON.stringify({ index, count: 4, names, sha }),
    );
    await writeFile(
      join(path, 'report.html'),
      `<script type="midscene_test_run_dump">${
        JSON.stringify({
          kind: 'test-runner',
          schemaVersion: 1,
          projects: [{
            documents: [{
              cases: names.map(name => ({ name, status: 'success' })),
            }],
          }],
        })
      }</script>`,
    );
  };
  await stage(1, 1, 'success');
  await stage(1, 2, 'failure');
  await stage(2, 1, 'success');
  await stage(3, 10, 'success');
  await stage(3, 2, 'failure');
  const selected = await selectShards(directory, 4, 'current');
  assert.equal(selected[0].result, 'failure');
  assert.match(selected[0].artifact, /-2$/);
  assert.match(selected[1].artifact, /-1$/);
  assert.match(selected[2].artifact, /-10$/);
  assert.equal(selected[3].result, 'failure');
  await assert.rejects(
    selectShards(directory, 4, 'current', [
      [],
      ['missing-case'],
      ['case-3'],
      [],
    ]),
    /coverage/,
  );
  await stage(4, 1, 'success', 'old');
  await assert.rejects(selectShards(directory, 4, 'current'), /revision/);
  await stage(4, 1, 'success', 'current', ['case-2']);
  await assert.rejects(
    selectShards(directory, 4, 'current'),
    /multiple shards/,
  );
});
