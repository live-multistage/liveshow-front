import { describe, it, expect } from 'vitest';
import { updateProfileSchema } from './update-profile.schema';

const base = { displayName: 'Ysrael Moreno' };

describe('updateProfileSchema taxDocument', () => {
  it('accepts a valid masked CPF', () => {
    expect(updateProfileSchema.safeParse({ ...base, taxDocument: '529.982.247-25' }).success).toBe(true);
  });

  it('accepts a valid CNPJ', () => {
    expect(updateProfileSchema.safeParse({ ...base, taxDocument: '11.222.333/0001-81' }).success).toBe(true);
  });

  it('rejects an invalid document', () => {
    expect(updateProfileSchema.safeParse({ ...base, taxDocument: '123' }).success).toBe(false);
  });

  it('accepts an empty string', () => {
    expect(updateProfileSchema.safeParse({ ...base, taxDocument: '' }).success).toBe(true);
  });
});
