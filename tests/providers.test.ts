import { describe, test, expect, beforeAll } from "bun:test";
import { MinecraftServerManager } from "../src/MinecraftServerManager";
import { NodeAdapter } from "../src/adapters/NodeAdapter";
import type { ServerCore } from "../src/types";

describe("MinecraftServerManager Providers", () => {
    let manager: MinecraftServerManager;

    beforeAll(() => {
        manager = new MinecraftServerManager(new NodeAdapter());
    });

    const providers: { core: ServerCore; version?: string }[] = [
        { core: "paper" },
        { core: "velocity" },
        { core: "folia" },
        { core: "waterfall" },
        { core: "purpur" },
        { core: "vanilla" },
        { core: "fabric", version: "1.20.1" },
        { core: "forge", version: "1.20.1" },
        { core: "mohist", version: "1.20.1" },
        { core: "arclight" }
    ];

    for (const { core, version } of providers) {
        test(`should fetch versions and latest build for ${core}`, async () => {
            console.log(`Testing ${core}...`);
            const versions = await manager.getVersions(core);
            expect(versions).toBeArray();
            expect(versions.length).toBeGreaterThan(0);

            // Pick a version to test (override or latest)
            let testVersion = version;
            if (!testVersion) {
                if (core === 'vanilla') {
                    // Vanilla versions are usually sorted new -> old in the manifest
                    // We pick the first one (latest) or a known stable one if first is a snapshot that might be unstable
                    testVersion = versions[0];
                } else {
                    // Paper/Purpur/etc usually return sorted old -> new
                    testVersion = versions[versions.length - 1];
                }
            }

            console.log(`  Fetching build for ${core} version ${testVersion}`);
            const build = await manager.getLatestBuild(core, testVersion!);

            expect(build).toBeDefined();
            expect(build.core).toBe(core);
            expect(build.version).toBe(testVersion as string);
            expect(build.downloads.application.url).toBeString();
            expect(build.downloads.application.url.length).toBeGreaterThan(0);
        }, 30000); // Increase timeout for network requests
    }


});
