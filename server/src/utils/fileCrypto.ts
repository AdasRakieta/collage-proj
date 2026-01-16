import crypto from 'crypto';
import fs from 'fs';

const algorithm = 'aes-256-gcm';
const KEY = process.env.FILE_ENCRYPTION_KEY || '';

if (!KEY) {
  console.warn('⚠️ FILE_ENCRYPTION_KEY is not set - file encryption disabled');
}

export const encryptFile = async (sourcePath: string, destPath: string): Promise<{ iv: string, authTag: string }> => {
  if (!KEY) {
    // just copy
    await fs.promises.copyFile(sourcePath, destPath);
    return { iv: '', authTag: '' };
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(KEY, 'hex'), iv);
  const input = fs.createReadStream(sourcePath);
  const output = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    input.pipe(cipher).pipe(output);
    output.on('finish', () => {
      const authTag = cipher.getAuthTag();
      resolve({ iv: iv.toString('hex'), authTag: authTag.toString('hex') });
    });
    output.on('error', reject);
    input.on('error', reject);
  });
};

export const decryptFileToStream = (encryptedPath: string, ivHex: string, authTagHex: string) => {
  if (!KEY) {
    return fs.createReadStream(encryptedPath);
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  const input = fs.createReadStream(encryptedPath);
  return input.pipe(decipher);
};
