import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(nodeScrypt);
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[0-9a-f]{32}$/.test(salt ?? '') || !/^[0-9a-f]{128}$/.test(expected ?? '')) return false;
  const key = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(expected, 'hex'));
}
