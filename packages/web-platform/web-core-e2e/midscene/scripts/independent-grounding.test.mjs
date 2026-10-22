import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';

for (const mode of ['balance', 'deepThink', 'refined']) {
  const effort = mode === 'balance' ? 'balance' : 'deepThink';
  const deepLocate = mode === 'refined';
  test(mode + ' coordinate protocol control on the captured Web viewport', {
    timeout: 15000,
  }, async t => {
    // This test must never inherit real planning/insight endpoints or credentials.
    const modelEnvironment = new Map(
      Object.entries(process.env).filter(([key]) =>
        /^(MIDSCENE_|OPENAI_)/.test(key)
      ),
    );
    for (const key of modelEnvironment.keys()) delete process.env[key];
    t.after(() => {
      for (const [key, value] of modelEnvironment) process.env[key] = value;
    });
    const { Agent } = await import(
      '../node_modules/@midscene/core/dist/es/agent/agent.mjs'
    );
    const { defineActionTap } = await import('@midscene/core/device');
    const { default: sharp } = await import('sharp');
    const screenshot = 'data:image/png;base64,' + (await sharp({
      create: {
        width: 393,
        height: 851,
        channels: 3,
        background: '#ffffff',
      },
    }).png().toBuffer()).toString('base64');
    const requests = [];
    const replies = [
      '<planning>Tap the test button once.</planning><log>Tap the button</log><action-type>Tap</action-type><action-param-json>'
      + JSON.stringify({
        locate: {
          prompt: 'the test button',
          ...(effort === 'balance' ? { point: [150, 50] } : {}),
        },
      }) + '</action-param-json>',
      ...(deepLocate
        ? [
          '<｜｜ref｜｜>target: test button<｜｜/ref｜｜><｜｜box｜｜>[[254,0,509,118]]<｜｜/box｜｜>'
          + '<｜｜ref｜｜>reference: neighboring control<｜｜/ref｜｜><｜｜box｜｜>[[0,0,254,118]]<｜｜/box｜｜>',
        ]
        : []),
      deepLocate
        ? '<｜｜point｜｜>[[380, 150]]<｜｜/point｜｜>'
        : '<｜｜point｜｜>[[500, 500]]<｜｜/point｜｜>',
    ];
    const server = createServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      requests.push(JSON.parse(Buffer.concat(chunks).toString()));
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          id: 'model-free-control',
          model: 'test',
          choices: [{
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: replies[requests.length - 1]
                ?? 'Unexpected extra request',
            },
          }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => {
      server.closeAllConnections();
      server.close();
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const fetchImpl = globalThis.fetch;
    t.mock.method(globalThis, 'fetch', (input, options) => {
      const url = new URL(
        typeof input === 'string' || input instanceof URL ? input : input.url,
      );
      assert.equal(
        url.origin,
        origin,
        'Model-free regression must not contact any external endpoint',
      );
      return fetchImpl(input, options);
    });
    const controller = new AbortController();
    const stop = new Error('Stop after the single inert test tap');
    const taps = [];
    const agent = new Agent({
      interfaceType: 'web',
      describe: () => 'Model-free full-frame coordinate protocol control',
      screenshotBase64: async () => screenshot,
      size: async () => ({ width: 393, height: 851 }),
      actionSpace: () => [defineActionTap(point => {
        taps.push(point);
        controller.abort(stop);
      })],
      url: async () => 'test://grounding',
      destroy: async () => {},
    }, {
      generateReport: false,
      autoPrintReportMsg: false,
      waitAfterAction: 0,
      modelConfig: {
        MIDSCENE_MODEL_API_KEY: 'model-free-test-placeholder',
        MIDSCENE_MODEL_NAME: 'test',
        MIDSCENE_MODEL_FAMILY: 'deepseek',
        MIDSCENE_MODEL_BASE_URL: `${origin}/v1`,
      },
    });
    t.after(() => agent.destroy());
    await agent.aiAct('Tap the test button once.', {
      effort,
      deepLocate,
      cacheable: false,
      abortSignal: controller.signal,
    }).catch(() => {
      assert.equal(controller.signal.reason, stop);
    });
    const tasks = agent.dump.executions.flatMap(execution => execution.tasks);
    const locate = tasks.find(task => task.subType === 'Locate');
    assert.ok(locate);
    if (effort === 'balance') {
      // Replay the actual failed planner response: pixel-looking [150,50] is
      // interpreted under the advertised normalized 0-1000 protocol, not pixels.
      assert.deepEqual(taps, [{ x: 59, y: 43 }]);
      assert.equal(requests.length, 1);
      assert.deepEqual(locate.param.locatedPixelResult.center, [59, 43]);
      return;
    }
    assert.equal(locate.param.locatedPixelResult, undefined);
    if (deepLocate) {
      assert.equal(
        requests.length,
        3,
        'Planner, search-area and refined locator are separate requests',
      );
      assert.equal(taps.length, 1);
      assert.ok(
        taps[0].x > 100 && taps[0].x < 200 && taps[0].y > 0 && taps[0].y < 100,
      );
      assert.equal(locate.log.dump.deepLocate, true);
      const area = locate.log.dump.taskInfo.searchArea;
      assert.ok(area && area.height < 851 && area.width <= 393);
      const parts = requests[2].messages.flatMap(m =>
        Array.isArray(m.content)
          ? m.content.filter(p => p.type === 'image_url')
          : []
      );
      assert.equal(parts.length, 1);
      const refined = await sharp(
        Buffer.from(parts[0].image_url.url.split(',')[1], 'base64'),
      ).metadata();
      assert.notDeepEqual([refined.width, refined.height], [393, 851]);
      return;
    }
    assert.deepEqual(taps, [{ x: 197, y: 426 }]);
    assert.equal(
      requests.length,
      2,
      'Exactly one planner request and one full-frame locator request',
    );
    const textParts = request =>
      request.messages.flatMap(message =>
        typeof message.content === 'string'
          ? [message.content]
          : message.content.filter(part => part.type === 'text').map(part =>
            part.text
          )
      ).join('\n');
    assert.doesNotMatch(
      textParts(requests[0]),
      /"point"\s*:/,
      'Deep planning must not request inline action coordinates',
    );
    const imageParts = requests[1].messages.flatMap(message =>
      Array.isArray(message.content)
        ? message.content.filter(part => part.type === 'image_url')
        : []
    );
    assert.equal(imageParts.length, 1);
    const metadata = await sharp(
      Buffer.from(imageParts[0].image_url.url.split(',')[1], 'base64'),
    ).metadata();
    assert.deepEqual(
      [metadata.width, metadata.height],
      [393, 851],
      'Locator receives the complete screenshot',
    );
    assert.equal(locate.param.locatedPixelResult, undefined);
    assert.equal(locate.log.dump.deepLocate, false);
    assert.equal(locate.log.dump.taskInfo.searchArea, undefined);
  });
}
