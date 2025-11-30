import { describe, test, expect, beforeAll } from 'bun:test';
import { MinecraftServerManager } from '@/MinecraftServerManager';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'test_downloads');

describe('MinecraftServerManager', () => {
    let manager: MinecraftServerManager;

    beforeAll(() => {
        manager = new MinecraftServerManager();
        if (existsSync(OUTPUT_DIR)) {
            rmSync(OUTPUT_DIR, { recursive: true, force: true });
        }
    });

    test('should fetch Paper versions and download latest', async () => {
        const versions = await manager.getVersions('paper');
        expect(versions.length).toBeGreaterThan(0);

        const latestVersion = versions[versions.length - 1];
        if (!latestVersion) throw new Error('No latest version found');
        const build = await manager.getLatestBuild('paper', latestVersion);
        expect(build).toBeDefined();
        expect(build.downloads.application.url).toContain('papermc.io');

        const result = await manager.downloadServer({
            core: 'paper',
            version: latestVersion,
            outputDir: OUTPUT_DIR
        });

        await Bun.write('debug_test.log', JSON.stringify(result, null, 2));

        expect(result.filename).toBeDefined();
        expect(await Bun.file(result.path).exists()).toBe(true);
        expect(result.downloadType).toBe('binary');
    }, 60000);

    test('should fetch Purpur versions and download latest', async () => {
        const versions = await manager.getVersions('purpur');
        expect(versions.length).toBeGreaterThan(0);

        const latestVersion = versions[versions.length - 1];
        if (!latestVersion) throw new Error('No latest version found');
        const build = await manager.getLatestBuild('purpur', latestVersion);
        expect(build).toBeDefined();

        const result = await manager.downloadServer({
            core: 'purpur',
            version: latestVersion,
            outputDir: OUTPUT_DIR
        });

        expect(existsSync(result.path)).toBe(true);
        expect(result.downloadType).toBe('binary');
    }, 60000);

    test('should fetch Mohist versions and download path file', async () => {
        const versions = await manager.getVersions('mohist');
        expect(versions.length).toBeGreaterThan(0);

        // Mohist 1.20.1 is known to work in our manual tests
        const version = '1.20.1';
        const build = await manager.getLatestBuild('mohist', version);
        expect(build).toBeDefined();

        const result = await manager.downloadServer({
            core: 'mohist',
            version: version,
            outputDir: OUTPUT_DIR
        });

        expect(existsSync(result.path)).toBe(true);
        expect(result.downloadType).toBe('path');

        // Verify content is a path
        const content = await Bun.file(result.path).text();
        expect(content).toContain('/var/mohistmc/');
    }, 60000);

    test('should fetch Vanilla versions and download latest', async () => {
        const versions = await manager.getVersions('vanilla');
        expect(versions.length).toBeGreaterThan(0);

        // Vanilla versions are usually sorted new -> old, so [0] is latest
        const latestVersion = versions[0];
        if (!latestVersion) throw new Error('No latest version found');
        const build = await manager.getLatestBuild('vanilla', latestVersion);
        expect(build).toBeDefined();
        expect(build.downloads.application.url).toContain('piston-data.mojang.com');

        const result = await manager.downloadServer({
            core: 'vanilla',
            version: latestVersion,
            outputDir: OUTPUT_DIR
        });

        expect(existsSync(result.path)).toBe(true);
        expect(result.downloadType).toBe('binary');
    }, 60000);

    test('should fetch Fabric versions and download launcher', async () => {
        const versions = await manager.getVersions('fabric');
        expect(versions.length).toBeGreaterThan(0);

        const version = '1.20.1';
        const build = await manager.getLatestBuild('fabric', version);
        expect(build).toBeDefined();

        const result = await manager.downloadServer({
            core: 'fabric',
            version: version,
            outputDir: OUTPUT_DIR
        });

        expect(existsSync(result.path)).toBe(true);
        expect(result.downloadType).toBe('binary'); // Fabric launcher is a binary jar
    }, 60000);

    test('should fetch Forge versions and download installer', async () => {
        const versions = await manager.getVersions('forge');
        expect(versions.length).toBeGreaterThan(0);

        const version = '1.20.1';
        const build = await manager.getLatestBuild('forge', version);
        expect(build).toBeDefined();

        const result = await manager.downloadServer({
            core: 'forge',
            version: version,
            outputDir: OUTPUT_DIR
        });

        expect(existsSync(result.path)).toBe(true);
        expect(result.downloadType).toBe('installer');
    }, 60000);
});
