import type { FileSystemAdapter } from './FileSystemAdapter';
import * as fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';

export class NodeAdapter implements FileSystemAdapter {
    join(...paths: string[]): string {
        return path.join(...paths);
    }

    async mkdir(dirPath: string): Promise<void> {
        await fs.mkdir(dirPath, { recursive: true });
    }

    async writeStream(filePath: string, stream: any): Promise<void> {
        const fileStream = createWriteStream(filePath);
        // @ts-ignore - Pipeline supports WebStreams in newer Node versions / Bun
        await pipeline(stream, fileStream);
    }

    async readFile(filePath: string): Promise<Uint8Array> {
        return fs.readFile(filePath);
    }

    async deleteFile(filePath: string): Promise<void> {
        await fs.unlink(filePath);
    }

    async getFileSize(filePath: string): Promise<number> {
        const stats = await fs.stat(filePath);
        return stats.size;
    }

    async calculateHash(filePath: string, algorithm: 'sha1' | 'sha256' | 'md5'): Promise<string> {
        const fileBuffer = await fs.readFile(filePath);
        const hashSum = crypto.createHash(algorithm);
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    async exists(filePath: string): Promise<boolean> {
        return existsSync(filePath);
    }
}
