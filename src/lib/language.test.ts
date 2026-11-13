import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, savedLanguage } from './language';

describe('visitor language preference', () => {
  it('defaults first-time visitors to Romanian', () => {
    expect(DEFAULT_LANGUAGE).toBe('ro');
    expect(savedLanguage(null)).toBe('ro');
  });
  it('retains an explicitly selected English preference', () => {
    expect(savedLanguage('en')).toBe('en');
  });
  it('ignores unsupported preferences instead of changing the default', () => {
    expect(savedLanguage('fr')).toBe('ro');
  });
});