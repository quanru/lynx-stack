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
  return originalChromiumProfile();
}

// Non-pixel original suites share this browser profile without claiming
// cross-platform PNG parity. Pixel callers still pass the Linux/version gate.
export function originalChromiumProfile() {
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

export type PixelSuite = 'web-core' | 'web-elements';
type OriginalPixelOptions = Omit<typeof pixelOptions, 'maxDiffPixelRatio'> & {
  maxDiffPixelRatio: number;
};
// This one original test explicitly overrides the helper's zero-ratio default.
// Keep it bound to the exact source PNG; YAML cannot relax arbitrary baselines.
export function originalPixelOptions(
  baseline: string,
  suite: PixelSuite = 'web-core',
): OriginalPixelOptions {
  return {
    ...pixelOptions,
    maxDiffPixelRatio: suite === 'web-core'
        && baseline === 'x-textarea/placeholder-font-size/font-size/index'
      ? 0.02
      : 0,
  };
}

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
  suite: PixelSuite = 'web-core',
) {
  if (
    !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)+$/.test(baseline)
    || !/^[a-zA-Z0-9_-]+$/.test(runId)
    || !['web-core', 'web-elements'].includes(suite)
  ) throw new Error('Invalid pixel baseline or run identity.');
  const expected = await readFile(
    new URL(
      `${
        suite === 'web-elements'
          ? '../../web-elements/tests/web-elements.spec.ts-snapshots'
          : '../tests/reactlynx.spec.ts-snapshots'
      }/${baseline}-chromium-linux.png`,
      import.meta.url,
    ),
  );
  const backend = (page as Page & {
    _expectScreenshot?: (
      options: OriginalPixelOptions & { expected: Buffer },
    ) => Promise<ScreenshotResult>;
  })._expectScreenshot;
  if (typeof backend !== 'function') {
    throw new Error('Pinned Playwright screenshot backend is unavailable.');
  }
  const result = await backend.call(page, {
    ...originalPixelOptions(baseline, suite),
    expected,
  });
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
