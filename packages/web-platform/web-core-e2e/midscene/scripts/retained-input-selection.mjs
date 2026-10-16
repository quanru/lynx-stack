// Source declarations, not AI cases. Keep component identity in every key.
export const retainedInputSelections = {
  'x-input': [
    'type-value-do-not-show-input',
    'type-password',
    'press-enter-do-not-submit-value',
    'attribute-disabled',
    'attribute-readonly',
    'event-confirm',
    'event-focus-blur',
    'event-input-number-dot',
  ],
  'x-textarea': [
    'press-enter-do-not-submit-value',
    'attribute-disabled',
    'attribute-readonly',
    'event-input',
    'event-confirm',
    'event-focus-blur',
  ],
  'x-list': ['auto-scroll', 'event-scroll', 'need-visible-item-info'],
  'x-text': ['x-text/text-maxline-with-inline-view-and-custom-truncation'],
  'x-image': [
    'x-image defers detached load events until connected',
    'inline-image defers detached load events until connected',
  ],
  'x-swiper': ['x-swiper/x-swiper-circular-click'],
  'x-audio-tt': [
    'attribute-src-change',
    'attribute-loop-close',
    'attribute-pause-on-hide',
    'attribute-interval',
    'event-srcloadingstatechanged',
    'event-playbackstatechanged',
    'event-finished',
    'event-seek',
    'event-error-src',
    'event-error-src-json',
    'event-error-playback',
    'method-play',
    'attribute-headers',
  ],
};
export const retainedInputBrowsers = ['chromium', 'firefox', 'webkit'];
export const retainedInputKeys = Object.entries(retainedInputSelections)
  .flatMap(([group, names]) => names.map(name => `${group}/${name}`));
// Keys identify expanded titles; sourceId identifies an original declaration.
export const retainedInputSources = Object.entries(retainedInputSelections)
  .flatMap(([group, names]) =>
    names.map(title => ({
      key: `${group}/${title}`,
      file: 'tests/web-elements.spec.ts',
      suite: 'web-elements test suite',
      group,
      title,
      sourceId: group === 'x-image'
        ? 'x-image/detached-load-until-connected'
        : `${group}/${title}`,
    }))
  );
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const retainedInputGrep = new RegExp(
  `web-elements test suite (?:${
    Object.entries(retainedInputSelections)
      .map(([group, names]) =>
        `${escape(group)} (${names.map(escape).join('|')})`
      )
      .join('|')
  })$`,
);
