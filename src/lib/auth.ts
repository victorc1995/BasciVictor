import { cookies } from 'next/headers';

const COOKIE_NAME = 'dashboard_victor_session';
const DEFAULT_PASSWORD = 'victor2026';

export function getExpectedPassword(): string {
  return process.env.APP_PASSWORD || DEFAULT_PASSWORD;
}

export function verifyPassword(password: string): boolean {
  const expected = getExpectedPassword();
  return password.trim() === expected.trim();
}

export function isAuthenticated(): boolean {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return false;
  
  // O valor da sessão é uma hash simples baseada na senha configurada
  const expectedToken = Buffer.from(`auth_${getExpectedPassword()}`).toString('base64');
  return session.value === expectedToken;
}

export function createSessionToken(): string {
  return Buffer.from(`auth_${getExpectedPassword()}`).toString('base64');
}

export { COOKIE_NAME };
