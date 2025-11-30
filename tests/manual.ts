import { MinecraftServerManager } from '../src';
import { ServerCore } from '../src/types';

async function testProvider(core: ServerCore, versionOverride?: string) {
    console.log(`\n=== Testing ${core} ===`);
    const manager = new MinecraftServerManager();

    try {
        console.log(`Fetching versions for ${core}...`);
        const versions = await manager.getVersions(core);
        console.log(`Found ${versions.length} versions. Last 5: ${versions.slice(-5).join(', ')}`);

        // Vanilla versions are sorted new to old usually, so [0] is latest. 
        // Others are old to new.
        let version = versionOverride;
        if (!version) {
            if (core === 'vanilla') {
                version = versions[0];
            } else {
                version = versions[versions.length - 1];
            }
        }

        console.log(`Fetching latest build for ${core} ${version}...`);

        const latestBuild = await manager.getLatestBuild(core, version);
        console.log(`Latest build: ${latestBuild.buildId} (${latestBuild.timestamp})`);
        console.log(`URL: ${latestBuild.downloads.application.url}`);
        console.log(`Hash: ${latestBuild.downloads.application.hash} (${latestBuild.downloads.application.hashType})`);

        console.log('Downloading server...');
        const result = await manager.downloadServer({
            core,
            version: version,
            outputDir: './downloads',
        });

        console.log('Download complete:', result.filename);
    } catch (e) {
        console.error(`FAILED ${core}:`, e);
    }
}

async function main() {
    await testProvider('paper');
    await testProvider('purpur');
    await testProvider('mohist', '1.20.1');

    await testProvider('vanilla');
    await testProvider('fabric', '1.20.1');
    await testProvider('forge', '1.20.1');

    // await testProvider('magma'); // Still not implemented
}

main().catch(console.error);
