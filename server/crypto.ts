/**
 * AES-256-GCM encryption / decryption for sensitive values stored in the DB.
 *
 * Wire format (all hex-encoded, concatenated):
 *   IV (12 bytes = 24 hex chars) | Auth-tag (16 bytes = 32 hex chars) | Ciphertext (n hex chars)
 *
 * The ENCRYPTION_KEY env var must be a 64-char hex string (32 raw bytes).
 * When the default all-zero key is in use, values are stored as-is with the
 * prefix "RAW:" so that decryption still works without the key.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { ENV } from "./_core/env";

const ALGO = "aes-256-gcm";
const RAW_PREFIX = "RAW:";
const ZERO_KEY = "0".repeat(64);

function isDefaultKey(): boolean {
  return !ENV.encryptionKey || ENV.encryptionKey === ZERO_KEY;
}

function getKey(): Buffer {
  if (isDefaultKey()) return Buffer.alloc(32, 0);
  return Buffer.from(ENV.encryptionKey, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns a hex-encoded string: IV || AuthTag || Ciphertext
 * If no real encryption key is configured, returns the plaintext prefixed with "RAW:".
 */
export function encrypt(plaintext: string): string {
  if (isDefaultKey()) return RAW_PREFIX + plaintext;
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

/**
 * Decrypt a value produced by encrypt().
 * Handles both "RAW:" prefixed values and properly encrypted values.
 * Throws if authentication fails (tampered data).
 */
export function decrypt(ciphertext: string): string {
  if (ciphertext.startsWith(RAW_PREFIX)) {
    return ciphertext.slice(RAW_PREFIX.length);
  }
  const key = getKey();
  const iv = Buffer.from(ciphertext.slice(0, 24), "hex");
  const tag = Buffer.from(ciphertext.slice(24, 56), "hex");
  const data = Buffer.from(ciphertext.slice(56), "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
