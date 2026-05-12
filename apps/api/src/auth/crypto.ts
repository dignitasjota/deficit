import {
  createHmac,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_LEN = 16;
/**
 * Formato del hash almacenado: `scrypt$N$r$p$<salt-b64>$<hash-b64>`.
 * N/r/p son parámetros documentados de scrypt. Usamos los defaults de
 * Node (N=16384, r=8, p=1) que están dentro de las recomendaciones
 * actuales de OWASP para 2026.
 */
const SCRYPT_PREFIX = 'scrypt$16384$8$1';

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LEN);
  const hash = await scrypt(plain, salt, SCRYPT_KEYLEN);
  return `${SCRYPT_PREFIX}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const saltB64 = parts[4];
  const hashB64 = parts[5];
  if (!saltB64 || !hashB64) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(plain, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ─── JWT (HS256, sin librería externa) ────────────────────────────────
// Implementación mínima dependiente solo de node:crypto.

interface JwtPayload {
  sub: string;
  sid: string;
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Buffer {
  const pad = (4 - (input.length % 4)) % 4;
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(b64, 'base64');
}

function sign(headerAndPayload: string, secret: string): string {
  return base64UrlEncode(createHmac('sha256', secret).update(headerAndPayload).digest());
}

export function signJwt(payload: Omit<JwtPayload, 'iat'>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: JwtPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(`${headerB64}.${payloadB64}`, secret);
  return `${headerB64}.${payloadB64}.${signature}`;
}

export class JwtVerifyError extends Error {
  constructor(
    message: string,
    public readonly code: 'invalid' | 'expired' | 'signature' | 'malformed' | 'wrong_type',
  ) {
    super(message);
    this.name = 'JwtVerifyError';
  }
}

export function verifyJwt(token: string, secret: string, expectedTyp: 'access' | 'refresh'): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JwtVerifyError('Token mal formado', 'malformed');
  }

  const [headerB64, payloadB64, signature] = parts as [string, string, string];
  const expected = sign(`${headerB64}.${payloadB64}`, secret);

  // timing-safe equality
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new JwtVerifyError('Firma inválida', 'signature');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as JwtPayload;
  } catch {
    throw new JwtVerifyError('Payload no es JSON válido', 'invalid');
  }

  if (typeof payload.exp !== 'number' || Date.now() / 1000 >= payload.exp) {
    throw new JwtVerifyError('Token expirado', 'expired');
  }

  if (payload.typ !== expectedTyp) {
    throw new JwtVerifyError(`Tipo de token incorrecto (esperado ${expectedTyp})`, 'wrong_type');
  }

  return payload;
}

export function generateOpaqueToken(bytes = 32): string {
  return base64UrlEncode(randomBytes(bytes));
}
