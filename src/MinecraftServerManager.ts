import type { CoreStrategy } from './strategies/CoreStrategy';
import { PaperStrategy } from './strategies/PaperStrategy';
import { PurpurStrategy } from './strategies/PurpurStrategy';
import { MohistStrategy } from './strategies/MohistStrategy';
//import { MagmaStrategy } from './strategies/MagmaStrategy';
import { VanillaStrategy } from './strategies/VanillaStrategy';
import { FabricStrategy } from './strategies/FabricStrategy';
import { ForgeStrategy } from './strategies/ForgeStrategy';
import { ArclightStrategy } from './strategies/ArclightStrategy';
import type { ServerCore, UnifiedBuild, DownloadOptions, DownloadResult } from './types';
import type { FileSystemAdapter } from './adapters/FileSystemAdapter';

export class MinecraftServerManager {
    private strategies: Map<string, CoreStrategy> = new Map();
    private fs: FileSystemAdapter;

    constructor(fsAdapter: FileSystemAdapter) {
        this.fs = fsAdapter;

        this.registerStrategy('paper', new PaperStrategy());
        this.registerStrategy('velocity', new PaperStrategy());
        this.registerStrategy('folia', new PaperStrategy());
        this.registerStrategy('waterfall', new PaperStrategy());

        this.registerStrategy('purpur', new PurpurStrategy());
        this.registerStrategy('mohist', new MohistStrategy());
        //this.registerStrategy('magma', new MagmaStrategy());
        this.registerStrategy('arclight', new ArclightStrategy());

        this.registerStrategy('vanilla', new VanillaStrategy());
        this.registerStrategy('fabric', new FabricStrategy());
        this.registerStrategy('forge', new ForgeStrategy());
    }

    private registerStrategy(core: string, strategy: CoreStrategy) {
        this.strategies.set(core, strategy);
    }
    getStrategies(): Map<string, CoreStrategy> {
        return this.strategies;
    }
    getStrategyNames(): string[] {
        return Array.from(this.strategies.keys());
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
        const filePath = this.fs.join(outputDir, filename);

        // Ensure output dir exists
        await this.fs.mkdir(outputDir);

        console.log(`Downloading ${artifact.url} to ${filePath}...`);

        const response = await fetch(artifact.url);
        if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
        if (!response.body) throw new Error('No response body');

        // Write to file
        await this.fs.writeStream(filePath, response.body);

        // Verify Hash
        if (artifact.downloadType === 'binary' && artifact.hash) {
            console.log(`Verifying hash (${artifact.hashType})...`);
            const hex = await this.fs.calculateHash(filePath, artifact.hashType || 'sha256');

            if (hex !== artifact.hash) {
                await this.fs.deleteFile(filePath); // Delete corrupt file
                throw new Error(`Hash mismatch! Expected ${artifact.hash}, got ${hex}`);
            }
            console.log('Hash verified!');
        } else if (artifact.downloadType === 'path') {
            console.log('Download type is "path". Skipping hash verification of the path file.');
        } else {
            console.warn('No hash provided for verification.');
        }

        const size = await this.fs.getFileSize(filePath);

        return {
            path: filePath,
            filename: filename,
            size: size,
            hash: artifact.hash || '',
            downloadType: artifact.downloadType
        };
    }
}
