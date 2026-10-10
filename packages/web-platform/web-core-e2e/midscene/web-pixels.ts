import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { devices, type Page } from 'playwright';

// Keep the original Chromium launch profile separate from non-pixel projects.
export const pixelLaunchArgs = [
  '--browser-ui-tests-verify-pixels',
  '--browser-test',
  '--font-render-hinting=none',
  '--disable-skia-runtime-opts',
  '--disable-font-subpixel-positioning',
  '--disable-lcd-text',
  '--disable-composited-antialiasing',
  '--disable-system-font-check',
  '--force-device-scale-factor=1',
  '--touch-slop-distance=5',
  '--disable-low-res-tiling',
  '--disable-smooth-scrolling',
  '--disable-gpu',
];

export function assertPixelEnvironment(platform: string, version: string) {
  if (platform !== 'linux' || version !== '1.61.1') {
    throw new Error(
      'Original Web pixel baselines require Linux and pinned Playwright 1.61.1.',
    );
  }
}

export function originalPixelProfile() {
  const version =
    createRequire(import.meta.url)('playwright/package.json').version;
  assertPixelEnvironment(process.platform, version);
  return {
    launch: {
      headless: true,
      args: [...pixelLaunchArgs],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined),
        ),
        LIBGL_ALWAYS_SOFTWARE: 'true',
        GALLIUM_HUD_SCALE: '1',
      },
    },
    context: { ...devices['Pixel 5'] },
  };
}

export const pixelOptions = {
  fullPage: true,
  animations: 'allow',
  caret: 'hide',
  scale: 'css',
  maxDiffPixelRatio: 0,
  timeout: 5000,
  isNot: false,
} as const;

interface ScreenshotResult {
  errorMessage?: string;
  actual?: Buffer;
  previous?: Buffer;
  diff?: Buffer;
  timedOut?: boolean;
}

// The pinned Playwright matcher calls this same backend. Reusing it preserves
// perceptual threshold defaults, stable-frame polling and mismatch semantics.
// Do not substitute a hand-written RGB comparator or AI similarity assertion.
export async function expectWebPixels(
  page: Page,
  baseline: string,
  runId: string,
) {
  if (
    !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+){2,}$/.test(baseline)
    || !/^[a-zA-Z0-9_-]+$/.test(runId)
  ) throw new Error('Invalid pixel baseline or run identity.');
  const expected = await readFile(
    resolve(
      '../tests/reactlynx.spec.ts-snapshots',
      baseline + '-chromium-linux.png',
    ),
  );
  const backend = (page as Page & {
    _expectScreenshot?: (
      options: typeof pixelOptions & { expected: Buffer },
    ) => Promise<ScreenshotResult>;
  })._expectScreenshot;
  if (typeof backend !== 'function') {
    throw new Error('Pinned Playwright screenshot backend is unavailable.');
  }
  const result = await backend.call(page, { ...pixelOptions, expected });
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid Playwright screenshot comparison result.');
  }
  if (result.errorMessage !== undefined || result.timedOut) {
    const directory = resolve('midscene_run/web-pixels', runId, baseline);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'expected.png'), expected);
    for (const key of ['actual', 'previous', 'diff'] as const) {
      if (result[key]) {
        await writeFile(resolve(directory, key + '.png'), result[key]);
      }
    }
    throw new Error(
      `Original Web pixel contract failed: ${
        result.errorMessage ?? 'comparison timed out'
      }; evidence: ${directory}`,
    );
  }
}
