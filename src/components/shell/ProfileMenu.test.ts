import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ProfileMenu renders SignOutDialog, whose server action imports `server-only`.
// Mocked here so the trigger can be rendered outside Next's server runtime.
vi.mock('@/lib/actions/auth', () => ({ signOutAction: async () => {} }));

import { ProfileMenu } from './ProfileMenu';

function render(username: string | null) {
  return renderToStaticMarkup(
    createElement(ProfileMenu, { username, avatar: null }),
  );
}

describe('ProfileMenu trigger', () => {
  const html = render('alex');

  it('opens the account popover through the disclosure attributes', () => {
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls=');
  });

  it('shows who is signed in', () => {
    expect(html).toContain('alex');
  });

  it('puts the three-dots affordance on the row', () => {
    expect(html).toContain('lucide-ellipsis');
  });

  it('does not render the actions until it is opened', () => {
    expect(html).not.toContain('Sign out');
    expect(html).not.toContain('View profile');
  });

  it('falls back to the profile label without a username', () => {
    expect(render(null)).toContain('Profile');
  });
});
