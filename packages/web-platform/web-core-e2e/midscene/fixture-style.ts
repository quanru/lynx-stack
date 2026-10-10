import type { Page } from 'playwright';

export interface FixtureStyleInput {
  style: 'offset' | 'transform';
}

export const lynxViewStyles = {
  offset: 'margin-top: 200px; margin-left: 200px;',
  transform: 'transform: translate(200px, 200px);',
} as const;

// Keep the browser callback as source: the config loader's keepNames transform
// otherwise inserts a Node-side __name helper into serialized functions.
export const lynxViewInitScript = `(rule) => {
  const inject = () => {
    if (!document.head) return false;
    const style = document.createElement('style');
    style.textContent = \`lynx-view { \${rule} }\`;
    document.head.appendChild(style);
    return true;
  };
  if (!inject()) {
    const observer = new MutationObserver(() => {
      if (inject()) observer.disconnect();
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }
}`;

// Mirror installLynxViewStyle in the original Playwright suite. Installing
// after navigation can miss the initial layoutchange and falsely pass at the
// viewport origin. This is fixture preparation, never a replacement for clicks.
export async function prepareLynxViewStyle(
  page: Pick<Page, 'url' | 'addInitScript'>,
  input: FixtureStyleInput,
) {
  if (!input || !Object.hasOwn(lynxViewStyles, input.style)) {
    throw new Error('web.prepareLynxView requires style offset or transform.');
  }
  if (page.url() !== 'about:blank') {
    throw new Error(
      'web.prepareLynxView must run before navigating the case page.',
    );
  }
  await page.addInitScript({
    content: `(${lynxViewInitScript})(${
      JSON.stringify(lynxViewStyles[input.style])
    });`,
  });
}
