import { describe, expect, it } from 'vitest';
import { asaasSubaccountSchema } from './asaas-subaccount.schema';

const cnpj = {
  name: 'Produtora X', email: 'fin@x.io', cpfCnpj: '12.345.678/0001-95', companyType: 'LIMITED',
  mobilePhone: '(11) 99999-9999', address: 'Rua A', addressNumber: '10', province: 'Centro',
  postalCode: '01000-000', incomeValue: 50000,
};

describe('asaasSubaccountSchema', () => {
  it('accepts a CNPJ holder with company type', () => {
    expect(asaasSubaccountSchema.safeParse(cnpj).success).toBe(true);
  });

  it('requires company type for a CNPJ', () => {
    expect(asaasSubaccountSchema.safeParse({ ...cnpj, companyType: undefined }).success).toBe(false);
  });

  it('requires birth date for a CPF', () => {
    const cpf = { ...cnpj, cpfCnpj: '123.456.789-09', companyType: undefined };
    expect(asaasSubaccountSchema.safeParse(cpf).success).toBe(false);
    expect(asaasSubaccountSchema.safeParse({ ...cpf, birthDate: '1990-05-16' }).success).toBe(true);
  });

  it('rejects a non-positive income', () => {
    expect(asaasSubaccountSchema.safeParse({ ...cnpj, incomeValue: 0 }).success).toBe(false);
  });

  it('rejects a malformed postal code', () => {
    expect(asaasSubaccountSchema.safeParse({ ...cnpj, postalCode: '123' }).success).toBe(false);
  });

  it('rejects a bad checksum despite the right length', () => {
    expect(asaasSubaccountSchema.safeParse({ ...cnpj, cpfCnpj: '11111111111111' }).success).toBe(false);
  });
});
