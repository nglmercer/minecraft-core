import type { CoreStrategy } from './strategies/CoreStrategy';
import { PaperStrategy } from './strategies/PaperStrategy';
import { PurpurStrategy } from './strategies/PurpurStrategy';
import { MohistStrategy } from './strategies/MohistStrategy';
import { MagmaStrategy } from './strategies/MagmaStrategy';
import { VanillaStrategy } from './strategies/VanillaStrategy';
import { FabricStrategy } from './strategies/FabricStrategy';
import { ForgeStrategy } from './strategies/ForgeStrategy';
import type { ServerCore, UnifiedBuild, DownloadOptions, DownloadResult } from './types';

export class MinecraftServerManager {
    private strategies: Map<string, CoreStrategy> = new Map();

    constructor() {
        this.registerStrategy('paper', new PaperStrategy());
        this.registerStrategy('velocity', new PaperStrategy());
        this.registerStrategy('folia', new PaperStrategy());
        this.registerStrategy('waterfall', new PaperStrategy());

        this.registerStrategy('purpur', new PurpurStrategy());
        this.registerStrategy('mohist', new MohistStrategy());
        this.registerStrategy('magma', new MagmaStrategy());

        this.registerStrategy('vanilla', new VanillaStrategy());
        this.registerStrategy('fabric', new FabricStrategy());
        this.registerStrategy('forge', new ForgeStrategy());
    }

    private registerStrategy(core: string, strategy: CoreStrategy) {
        this.strategies.set(core, strategy);
    }

    private getStrategy(core: string): CoreStrategy {
        const strategy = this.strategies.get(core);
        if (!strategy) {
            throw new Error(`No strategy found for core: ${core}`);
        }
        return strategy;
    }

    async getVersions(core: ServerCore): Promise<string[]> {
        return this.getStrategy(core).getVersions(core);
    }

    async getBuilds(core: ServerCore, version: string): Promise<UnifiedBuild[]> {
        return this.getStrategy(core).getBuilds(core, version);
    }

    async getLatestBuild(core: ServerCore, version: string): Promise<UnifiedBuild> {
        return this.getStrategy(core).getLatestBuild(core, version);
    }

    async downloadServer(options: DownloadOptions): Promise<DownloadResult> {
        const { core, version, outputDir } = options;
        let build: UnifiedBuild;

        if (options.buildId) {
            // Optimization: If strategy supports fetching single build, use it.
            // For now, we fetch all (or latest logic)
            const builds = await this.getBuilds(core, version);
            const found = builds.find(b => b.buildId === options.buildId);
            if (!found) throw new Error(`Build ${options.buildId} not found for ${core} ${version}`);
            build = found;
        } else {
            build = await this.getLatestBuild(core, version);
        }

        const artifact = build.downloads.application;
        const filename = options.filename || artifact.name;
        const filePath = (await import('node:path')).join(outputDir, filename);

        // Ensure output dir exists
        await (await import('node:fs/promises')).mkdir(outputDir, { recursive: true });

        console.log(`Downloading ${artifact.url} to ${filePath}...`);

        const response = await fetch(artifact.url);
        if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
        if (!response.body) throw new Error('No response body');

        // Write to file
        const fileStream = (await import('node:fs')).createWriteStream(filePath);
        const { pipeline } = await import('node:stream/promises');
        // @ts-ignore - Bun/Node stream compatibility
        await pipeline(response.body, fileStream);

        // Verify Hash (only if binary, or if we want to verify the file containing the path?)
        // Usually hash is for the binary. If we got a path, the hash probably matches the binary, not the path string.
        // So we skip hash verification for 'path' type unless we download the binary.
        if (artifact.downloadType === 'binary' && artifact.hash) {
            console.log(`Verifying hash (${artifact.hashType})...`);
            const fileBuffer = await (await import('node:fs/promises')).readFile(filePath);
            const crypto = await import('node:crypto');
            const hashSum = crypto.createHash(artifact.hashType || 'sha256');
            hashSum.update(fileBuffer);
            const hex = hashSum.digest('hex');

            if (hex !== artifact.hash) {
                await (await import('node:fs/promises')).unlink(filePath); // Delete corrupt file
                throw new Error(`Hash mismatch! Expected ${artifact.hash}, got ${hex}`);
            }
            console.log('Hash verified!');
        } else if (artifact.downloadType === 'path') {
            console.log('Download type is "path". Skipping hash verification of the path file.');
        } else {
            console.warn('No hash provided for verification.');
        }

        const stats = await (await import('node:fs/promises')).stat(filePath);

        return {
            path: filePath,
            filename: filename,
            size: stats.size,
            hash: artifact.hash || '',
            downloadType: artifact.downloadType
        };
    }
}
