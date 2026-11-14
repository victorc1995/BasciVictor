import { cookies } from 'next/headers';

const COOKIE_NAME = 'dashboard_victor_session';
const DEFAULT_USERNAME = 'familia';
const DEFAULT_PASSWORD = '181126';

export function getExpectedUsername(): string {
  return process.env.APP_USERNAME || DEFAULT_USERNAME;
}

export function getExpectedPassword(): string {
  return process.env.APP_PASSWORD || DEFAULT_PASSWORD;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = getExpectedUsername().toLowerCase().trim();
  const cleanInputUser = (username || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanExpectedUser = expectedUser.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const userMatches = cleanInputUser === cleanExpectedUser;
  const passwordMatches = (password || '').trim() === getExpectedPassword().trim();

  return userMatches && passwordMatches;
}

export function isAuthenticated(): boolean {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return false;

  const expectedToken = Buffer.from(`auth_${getExpectedUsername()}_${getExpectedPassword()}`).toString('base64');
  // Aceita também o formato de token anterior para não quebrar sessões ativas
  const legacyToken = Buffer.from(`auth_${getExpectedPassword()}`).toString('base64');

  return session.value === expectedToken || session.value === legacyToken;
}

export function createSessionToken(): string {
  return Buffer.from(`auth_${getExpectedUsername()}_${getExpectedPassword()}`).toString('base64');
}

export { COOKIE_NAME };
