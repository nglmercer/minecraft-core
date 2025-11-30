import { MinecraftServerManager } from '../src/MinecraftServerManager';
import type { ServerCore } from '../src/types';

const manager = new MinecraftServerManager();

async function testProvider(core: ServerCore, versionOverride?: string) {
    console.log(`\n--- Testing ${core} ---`);
    try {
        const versions = await manager.getVersions(core);
        console.log(`Found ${versions.length} versions`);

        let version = versionOverride;
        if (!version) {
            if (core === 'vanilla') {
                // Vanilla versions are usually sorted new -> old
                version = versions[0];
            } else {
                version = versions[versions.length - 1];
            }
        }

        if (!version) {
            console.error('No version found to test');
            return;
        }

        console.log(`Testing version: ${version}`);
        const latestBuild = await manager.getLatestBuild(core, version);
        console.log(`Latest build: ${latestBuild.buildId}`);

        const result = await manager.downloadServer({
            core: core,
            version: version,
            outputDir: './test_downloads_manual'
        });
        console.log(`Downloaded to: ${result.path}`);
        console.log(`Type: ${result.downloadType}`);

    } catch (e) {
        console.error(`Error testing ${core}:`, e);
    }
}

async function main() {
    await testProvider('paper');
    await testProvider('purpur');
    await testProvider('mohist', '1.20.1');

    await testProvider('vanilla');
    await testProvider('fabric', '1.20.1');
    await testProvider('forge', '1.20.1');
}

main();
