import { test, expect } from 'vitest';
import { loginSchema, registerSchema, socialLoginSchema, emailOnlySchema, resetPasswordSchema } from './schemas';

test('login requires email and any non-empty password', () => {
  expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
});

test('login defaults rememberMe to true', () => {
  const parsed = loginSchema.parse({ email: 'a@b.co', password: 'x' });
  expect(parsed.rememberMe).toBe(true);
});

test('register enforces min password and confirmation match', () => {
  const base = { email: 'a@b.co', displayName: 'Ana', password: '12345678', confirmPassword: '12345678' };
  expect(registerSchema.safeParse(base).success).toBe(true);
  expect(registerSchema.safeParse({ ...base, password: '1234567', confirmPassword: '1234567' }).success).toBe(false);
  const mismatch = registerSchema.safeParse({ ...base, confirmPassword: 'other' });
  expect(mismatch.success).toBe(false);
  if (!mismatch.success) expect(mismatch.error.issues[0]?.path).toEqual(['confirmPassword']);
});

test('social login accepts the two providers and nothing else', () => {
  expect(socialLoginSchema.safeParse({ provider: 'GOOGLE', idToken: 'tok' }).success).toBe(true);
  expect(socialLoginSchema.safeParse({ provider: 'APPLE', idToken: 'tok' }).success).toBe(true);
  expect(socialLoginSchema.safeParse({ provider: 'FACEBOOK', idToken: 'tok' }).success).toBe(false);
});

test('social login requires a non-empty, bounded id token', () => {
  expect(socialLoginSchema.safeParse({ provider: 'GOOGLE', idToken: '' }).success).toBe(false);
  expect(socialLoginSchema.safeParse({ provider: 'GOOGLE', idToken: 'x'.repeat(4097) }).success).toBe(false);
});

test('social login carries the Apple-only fields as optional', () => {
  const parsed = socialLoginSchema.parse({
    provider: 'APPLE',
    idToken: 'tok',
    nonce: 'n',
    fullName: 'Ana',
    authorizationCode: 'code',
  });
  expect(parsed).toMatchObject({ nonce: 'n', fullName: 'Ana', authorizationCode: 'code' });
});

// Mirrors loginSchema: the app always wants a long-lived session on a phone.
test('social login defaults rememberMe to true', () => {
  expect(socialLoginSchema.parse({ provider: 'GOOGLE', idToken: 'tok' }).rememberMe).toBe(true);
});

test('email-only accepts a valid email and rejects invalid or missing', () => {
  expect(emailOnlySchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  expect(emailOnlySchema.safeParse({ email: 'invalid' }).success).toBe(false);
  expect(emailOnlySchema.safeParse({ email: '' }).success).toBe(false);
  expect(emailOnlySchema.safeParse({}).success).toBe(false);
});

test('reset-password enforces min password, confirmation match, and token presence', () => {
  const base = { token: 'abc123', password: '12345678', confirmPassword: '12345678' };
  expect(resetPasswordSchema.safeParse(base).success).toBe(true);
  expect(resetPasswordSchema.safeParse({ ...base, password: '1234567', confirmPassword: '1234567' }).success).toBe(false);
  expect(resetPasswordSchema.safeParse({ ...base, token: '' }).success).toBe(false);
  expect(resetPasswordSchema.safeParse({ ...base, token: undefined }).success).toBe(false);
  const mismatch = resetPasswordSchema.safeParse({ ...base, confirmPassword: 'other' });
  expect(mismatch.success).toBe(false);
  if (!mismatch.success) expect(mismatch.error.issues[0]?.path).toEqual(['confirmPassword']);
});
