import { describe, it, expect } from 'vitest';
import {
  digitsOnly,
  formatCpfCnpj,
  formatPhone,
  formatPostalCode,
  digitsToCents,
  formatBRLFromCents,
} from './asaas-input-masks';

describe('digitsOnly', () => {
  it('strips everything but digits', () => {
    expect(digitsOnly('12.345.678/0001-95')).toBe('12345678000195');
  });
});

describe('formatCpfCnpj', () => {
  it('formats a full CPF', () => {
    expect(formatCpfCnpj('12345678909')).toBe('123.456.789-09');
  });

  it('formats a full CNPJ', () => {
    expect(formatCpfCnpj('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('never keeps more than 14 digits', () => {
    expect(formatCpfCnpj('1234567800019599999')).toBe('12.345.678/0001-95');
  });

  it('re-formats an already-formatted value idempotently', () => {
    expect(formatCpfCnpj('123.456.789-09')).toBe('123.456.789-09');
  });
});

describe('formatPhone', () => {
  it('formats an 11-digit mobile number', () => {
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777');
  });

  it('formats a 10-digit landline number', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  });
});

describe('formatPostalCode', () => {
  it('formats an 8-digit CEP', () => {
    expect(formatPostalCode('01310100')).toBe('01310-100');
  });
});

describe('digitsToCents + formatBRLFromCents', () => {
  it('reads typed digits as cents and formats as BRL', () => {
    expect(digitsToCents('5000000')).toBe(5_000_000);
    // Node's ICU renders the currency-symbol gap as a non-breaking space.
    expect(formatBRLFromCents(5_000_000).replace(/ /g, ' ')).toBe('R$ 50.000,00');
  });
});
