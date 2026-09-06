import { describe, expect, it } from 'vitest';
import { isCpfOrCnpj, normalizeTaxDocument } from './document';

describe('normalizeTaxDocument', () => {
  it('strips mask characters', () => {
    expect(normalizeTaxDocument('529.982.247-25')).toBe('52998224725');
    expect(normalizeTaxDocument('11.222.333/0001-81')).toBe('11222333000181');
  });
});

describe('isCpfOrCnpj', () => {
  it('accepts a valid CPF and CNPJ, masked or not', () => {
    expect(isCpfOrCnpj('529.982.247-25')).toBe(true);
    expect(isCpfOrCnpj('52998224725')).toBe(true);
    expect(isCpfOrCnpj('11.222.333/0001-81')).toBe(true);
  });
  it('rejects bad checksums, repeated digits and wrong lengths', () => {
    expect(isCpfOrCnpj('52998224724')).toBe(false);
    expect(isCpfOrCnpj('11111111111')).toBe(false);
    expect(isCpfOrCnpj('11222333000180')).toBe(false);
    expect(isCpfOrCnpj('123')).toBe(false);
    expect(isCpfOrCnpj('')).toBe(false);
  });
});
