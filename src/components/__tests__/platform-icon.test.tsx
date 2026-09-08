import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlatformIcon } from '../PlatformIcon';

describe('private platform artwork', () => {
  it('renders known brands inline without requesting a remote icon', () => {
    const html = renderToStaticMarkup(<PlatformIcon platformName="Netflix" />);
    expect(html).toContain('<path');
    expect(html).not.toMatch(/<(img|image)|\s(?:src|href)=/);
  });
  it('uses the known domain when a credential has a custom display name', () => {
    const html = renderToStaticMarkup(<PlatformIcon platformName="Mi streaming" url="https://netflix.com" />);
    expect(html).toContain('<path');
  });
  it('keeps unknown private domains as local initials', () => {
    const html = renderToStaticMarkup(<PlatformIcon platformName="Servicio privado" url="https://private.example" />);
    expect(html).toContain('Sp');
    expect(html).not.toMatch(/<(img|image)|\s(?:src|href)=/);
  });
});
