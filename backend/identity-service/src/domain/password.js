import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const KEY_LENGTH = 64;
export async function hashPassword(password) {
    const salt = randomBytes(16);
    const key = await derive(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(password, stored) {
    const [, salt, key] = stored.split('$');
    const expected = Buffer.from(key, 'base64');
    const actual = await derive(password, Buffer.from(salt, 'base64'), KEY_LENGTH);
    return timingSafeEqual(actual, expected);
}
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));
//# sourceMappingURL=password.js.map