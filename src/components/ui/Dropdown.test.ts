import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dropdown } from './Dropdown';

/**
 * The trigger render prop hands out a11y wiring the caller cannot be expected to
 * know, so it must hand out attributes that are valid on the element it will be
 * spread onto.
 *
 * Regression: it used to pass a prop named `expanded`, which is not a DOM
 * attribute. Three of the four call sites destructured and renamed it, but
 * `FolderList` spread `{...props}` straight onto its `<button>` — which put
 * `expanded={false}` on a real element and made React warn on every render of
 * the notes screen.
 */

const items = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
];

function renderSpreadingTrigger() {
  return renderToStaticMarkup(
    createElement(Dropdown, {
      value: 'a',
      items,
      onChange: () => {},
      // Exactly how every call site uses it once the props are DOM-ready.
      trigger: (props: Record<string, unknown>) =>
        createElement('button', { ...props, type: 'button', className: 'chip' }, 'pick'),
    }),
  );
}

describe('Dropdown trigger props', () => {
  const html = renderSpreadingTrigger();

  it('gives the trigger aria-expanded, which is a real DOM attribute', () => {
    expect(html).toContain('aria-expanded="false"');
  });

  it('gives the trigger aria-haspopup so it announces the listbox', () => {
    expect(html).toContain('aria-haspopup="listbox"');
  });

  it('passes only DOM-safe keys, so spreading is safe without remapping', () => {
    const keys: string[] = [];
    // Must actually render — `createElement` alone never invokes the trigger.
    renderToStaticMarkup(
      createElement(Dropdown, {
        value: 'a',
        items,
        onChange: () => {},
        trigger: (props: Record<string, unknown>) => {
          keys.push(...Object.keys(props));
          return null;
        },
      }),
    );
    // `ref` is a first-class prop on React 19 elements, so it is safe to spread.
    // Asserting the exact key set — rather than grepping the rendered HTML for a
    // stray `expanded=` — is what makes this a real regression test: React's
    // server renderer silently drops an unknown boolean attribute instead of
    // emitting it, so the original bug produced no markup here at all. The
    // warning only fires on the client. The key set is where it is observable.
    expect(keys.sort()).toEqual(['aria-expanded', 'aria-haspopup', 'onClick', 'ref']);
  });
});
