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
};
export const retainedInputBrowsers = ['chromium', 'firefox', 'webkit'];
export const retainedInputKeys = Object.entries(retainedInputSelections)
  .flatMap(([group, names]) => names.map(name => `${group}/${name}`));
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
