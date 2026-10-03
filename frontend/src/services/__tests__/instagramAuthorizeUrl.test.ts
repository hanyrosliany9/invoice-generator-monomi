import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/api', () => ({ apiClient: {} }));

import { safeAuthorizeUrl } from '../instagram';

describe('safeAuthorizeUrl', () => {
  it('allows only https Instagram authorize URLs in production builds', () => {
    expect(safeAuthorizeUrl('https://www.instagram.com/oauth/authorize?client_id=1&state=x', false)).toBe(
      'https://www.instagram.com/oauth/authorize?client_id=1&state=x',
    );
    expect(safeAuthorizeUrl('https://instagram.com/oauth/authorize', false)).not.toBeNull();
    for (const bad of [
      'http://www.instagram.com/oauth/authorize',
      'https://evil.example/oauth/authorize',
      'https://www.instagram.com.evil.example/oauth/authorize',
      'https://evilinstagram.com/x',
      'https://user:pass@www.instagram.com/oauth/authorize',
      'https://www.instagram.com:8443/oauth/authorize',
      'javascript:alert(1)',
      'http://127.0.0.1:5399/oauth/authorize',
      '//www.instagram.com/oauth/authorize',
      42,
      null,
    ]) {
      expect(safeAuthorizeUrl(bad, false)).toBeNull();
    }
  });

  it('development builds also accept a local fake OAuth server', () => {
    expect(safeAuthorizeUrl('http://127.0.0.1:5399/oauth/authorize', true)).not.toBeNull();
    expect(safeAuthorizeUrl('http://localhost:5399/oauth/authorize', true)).not.toBeNull();
    expect(safeAuthorizeUrl('https://evil.example/oauth/authorize', true)).toBeNull();
  });
});
