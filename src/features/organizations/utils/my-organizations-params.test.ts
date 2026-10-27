import { describe, it, expect } from 'vitest';
import { hrefForMyOrganizations, parseMyOrganizationsParams } from './my-organizations-params';

describe('parseMyOrganizationsParams', () => {
  it('defaults to page 1 with no tab or search', () => {
    expect(parseMyOrganizationsParams(new URLSearchParams())).toEqual({ page: 1 });
  });

  it('reads tab, q and page', () => {
    expect(parseMyOrganizationsParams(new URLSearchParams('tab=archived&q=acme&page=3'))).toEqual({
      tab: 'archived',
      q: 'acme',
      page: 3,
    });
  });

  it('drops unknown tabs and invalid pages', () => {
    expect(parseMyOrganizationsParams(new URLSearchParams('tab=minhas&page=0'))).toEqual({ page: 1 });
    expect(parseMyOrganizationsParams(new URLSearchParams('page=abc'))).toEqual({ page: 1 });
  });

  it('trims q and drops blank or oversized searches', () => {
    expect(parseMyOrganizationsParams(new URLSearchParams('q=%20%20acme%20'))).toEqual({ q: 'acme', page: 1 });
    expect(parseMyOrganizationsParams(new URLSearchParams('q=%20%20'))).toEqual({ page: 1 });
    expect(parseMyOrganizationsParams(new URLSearchParams(`q=${'a'.repeat(121)}`))).toEqual({ page: 1 });
  });

  it('floors fractional pages', () => {
    expect(parseMyOrganizationsParams(new URLSearchParams('page=2.9'))).toEqual({ page: 2 });
  });
});

describe('hrefForMyOrganizations', () => {
  it('omits defaults for the canonical URL', () => {
    expect(hrefForMyOrganizations({ page: 1 })).toBe('/dashboard/organizations');
  });

  it('keeps tab, q and page', () => {
    expect(hrefForMyOrganizations({ tab: 'owned', q: 'acme co', page: 2 })).toBe(
      '/dashboard/organizations?tab=owned&q=acme+co&page=2',
    );
  });

  it('drops page 1 and an empty q', () => {
    expect(hrefForMyOrganizations({ tab: 'invited', q: '', page: 1 })).toBe('/dashboard/organizations?tab=invited');
  });
});
