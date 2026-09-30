import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Deliberately bypass SDK adapters: valid image_url requests isolate provider
// behavior from Midscene. Never persist credentials or request headers.
const output = process.env.VISION_DIAGNOSTIC_DIR ?? './vision-diagnostic';
await mkdir(output, { recursive: true });
let reportDir = process.env.VISION_REPORT_DIR;
if (!reportDir) {
  const response = await fetch(
    'https://api.github.com/repos/quanru/lynx-stack/actions/artifacts/10622529654/zip',
    { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}` }, redirect: 'follow' },
  );
  if (!response.ok) throw new Error(`Artifact download: HTTP ${response.status}`);
  const archive = join(output, 'historical-report.zip');
  await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  execFileSync('unzip', ['-q', '-o', archive, '-d', join(output, 'historical')]);
  reportDir = join(output, 'historical/report');
}
const fixtures = new Map();
for (const file of await readdir(reportDir)) {
  if (!file.startsWith('web-') || !file.endsWith('.html')) continue;
  const html = await readFile(join(reportDir, file), 'utf8');
  const images = new Map();
  for (const match of html.matchAll(/<script\s+([^>]*type="midscene-image"[^>]*)>([\s\S]*?)<\/script>/g)) {
    images.set(match[1].match(/data-id="([^"]+)"/)?.[1], match[2].trim());
  }
  for (const match of html.matchAll(/<script\s+[^>]*type="midscene_web_dump"[^>]*>\s*(\{[\s\S]*?)<\/script>/g)) {
    let dump;
    try { dump = JSON.parse(match[1]); } catch { continue; }
    for (const execution of dump.executions ?? []) for (const task of execution.tasks ?? []) {
      const demand = task.param?.dataDemand;
      const name = /very large bold/.test(demand) ? 'gradient'
        : /small square Lynx/.test(demand) ? 'logo'
        : /prefilled with the word/.test(demand) ? 'input' : undefined;
      const image = images.get(task.uiContext?.screenshot?.id);
      if (name && image && !fixtures.has(name)) fixtures.set(name, { image, demand });
    }
  }
}
if (fixtures.size !== 3) throw new Error(`Expected three fixtures, got ${fixtures.size}`);
const results = [];
const base = process.env.MIDSCENE_MODEL_BASE_URL.replace(/\/+$/, '');
const model = process.env.VISION_USE_HISTORICAL_MODEL === 'true'
  ? 'ep-20260921115426-jf8vm' : process.env.MIDSCENE_MODEL_NAME;
console.log(JSON.stringify({ configuredModel: model, modelFamily: process.env.MIDSCENE_MODEL_FAMILY }));
async function probe(name, image, prompt, mode, system) {
  const content = [{ type: 'text', text: prompt }];
  if (image) content.unshift({ type: 'image_url', image_url: { url: image, detail: 'high' } });
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MIDSCENE_MODEL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0,
      thinking: { type: 'disabled' }, max_tokens: 1024,
      messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content }] }),
    signal: AbortSignal.timeout(90_000),
  });
  const data = await response.json();
  const result = { name, mode, http: response.status, model: data.model,
    promptTokens: data.usage?.prompt_tokens,
    imageSha256: image ? createHash('sha256').update(Buffer.from(image.split(',')[1], 'base64')).digest('hex') : null,
    prompt, response: data.choices?.[0]?.message?.content };
  results.push(result);
  console.log(JSON.stringify(result));
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
  if (!response.ok) throw new Error(`Vision probe: HTTP ${response.status}`);
}
const blind = 'Describe only what is actually visible in the attached screenshot. Transcribe all visible text exactly. Describe any graphic and its colors. If you cannot see an image, say so. Do not guess.';
for (const [name, fixture] of fixtures) {
  await probe(name, fixture.image, blind, 'blind-description');
}
await probe('no-image', undefined, blind, 'negative-control');
for (const [name, fixture] of fixtures) {
  const wrong = name === 'gradient' ? fixtures.get('input').demand : fixtures.get('gradient').demand;
  await probe(name, fixture.image, `Is this statement true in the screenshot? Return a boolean and visible evidence: ${wrong}`, 'mismatched-assertion');
}
const system = await readFile(new URL('./diagnostic-insight-system.txt', import.meta.url), 'utf8');
for (const [name, fixture] of fixtures) {
  const query = { StatementIsTruthy: `Boolean, based on the current screenshot and its contents if provided, unless the user explicitly asks to compare with reference images, whether the following statement is true: ${fixture.demand}` };
  const prompt = `\n<PageDescription>\n\n</PageDescription>\n\n<DATA_DEMAND>\n${JSON.stringify(query, null, 2)}\n</DATA_DEMAND>\n`;
  for (let trial = 1; trial <= 3; trial++) await probe(name, fixture.image, prompt, `original-insight-${trial}`, system);
}
const rows = results.map(r => `| ${r.name} | ${r.mode} | ${r.promptTokens ?? '-'} | ${(r.response ?? '').replaceAll('|', '\\|').replaceAll('\n', '<br>')} |`);
const summary = `## Vision capability diagnostic\n\nActual response model: \`${results[0]?.model}\`\n\n| Image | Probe | Input tokens | Response |\n|---|---|---|---|\n${rows.join('\n')}\n`;
await writeFile(join(output, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary);
