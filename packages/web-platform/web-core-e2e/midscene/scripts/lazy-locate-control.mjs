import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Agent } from '../node_modules/@midscene/core/dist/es/agent/agent.mjs';
import { defineActionTap } from '../node_modules/@midscene/core/dist/es/device/index.mjs';

const scenes = [
  { name: 'horizontal', file: 'grounding-horizontal.jpeg', bounds: [100, 0, 200, 100],
    prompt: 'Click the BLUE square on the RIGHT of the horizontal pair exactly once. Do not click the left square. Stop after that single click.' },
  { name: 'loaded', file: 'grounding-loaded.jpeg', bounds: [100, 100, 200, 200],
    prompt: 'Click the BLUE square on the RIGHT of the horizontal pair below the red square exactly once. Do not click the left square. Stop after that single click.' },
];
await mkdir('midscene_run/grounding-control', { recursive: true });
const results = [];
for (const scene of scenes) for (const deepLocate of [false, true]) for (let trial = 1; trial <= 2; trial++) {
  const bytes = await readFile(new URL('./' + scene.file, import.meta.url));
  const taps = [], controller = new AbortController();
  const agent = new Agent({
    interfaceType: 'web', describe: () => 'Immutable hosted screenshot; diagnostic inert input only',
    screenshotBase64: async () => 'data:image/jpeg;base64,' + bytes.toString('base64'),
    size: async () => ({ width: 393, height: 851 }),
    actionSpace: () => [defineActionTap(point => { taps.push(point); controller.abort(new Error('Stop after inert diagnostic tap')); })],
    url: async () => 'diagnostic://immutable/' + scene.name, destroy: async () => {},
  }, { reportFileName: 'grounding-' + scene.name + '-' + deepLocate + '-' + trial + '.html',
    autoPrintReportMsg: false, waitAfterAction: 0 });
  let failed = false;
  try { await agent.aiAct(scene.prompt, { effort: 'deepThink', deepLocate, cacheable: false, abortSignal: controller.signal }); }
  catch { failed = taps.length !== 1 || !controller.signal.aborted; }
  const tasks = agent.dump.executions.flatMap(e => e.tasks);
  const [left, top, right, bottom] = scene.bounds;
  const matched = !failed && taps.length === 1 && taps[0].x > left && taps[0].x < right && taps[0].y > top && taps[0].y < bottom;
  const result = { scene: scene.name, deepLocate, trial, imageSha256: createHash('sha256').update(bytes).digest('hex'),
    screenshot: { width: 393, height: 851 }, diagnosticBounds: scene.bounds, taps, matched,
    locates: tasks.filter(t => t.subType === 'Locate').map(t => ({ param: t.param, output: t.output,
      searchArea: t.log?.dump?.taskInfo?.searchArea, deepLocate: t.log?.dump?.deepLocate, model: t.usage?.response_model_name,
      rawResponse: t.log?.rawResponse })),
    models: [...new Set(tasks.map(t => t.usage?.response_model_name).filter(Boolean))] };
  results.push(result);
  await agent.destroy();
  await writeFile('midscene_run/grounding-control/results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ scene: scene.name, deepLocate, trial, taps, matched, models: result.models }));
}
console.log(JSON.stringify({ diagnosticOnly: true, trials: results.length, candidateMatched: results.filter(r => r.deepLocate && r.matched).length,
  candidateTotal: results.filter(r => r.deepLocate).length }));
if (results.some(r => r.deepLocate && !r.matched)) process.exitCode = 1;
