import { describe, test, expect, beforeAll } from "bun:test";
import { MinecraftServerManager } from "../src/MinecraftServerManager";
import { NodeAdapter } from "../src/adapters/NodeAdapter";
import type { ServerCore } from "../src/types";

describe("Strategy Specific Tests", () => {
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
        test(`should resolve download URL for ${core}`, async () => {
            const versions = await manager.getVersions(core);
            let testVersion = version;
            if (!testVersion) {
                if (core === 'vanilla') {
                    testVersion = versions[0];
                } else {
                    testVersion = versions[versions.length - 1];
                }
            }

            const build = await manager.getLatestBuild(core, testVersion!);
            const strategy = manager.getStrategies().get(core)!;

            const url = await strategy.getDownloadUrl(core, testVersion!, build.buildId, build.downloads.application.name);

            expect(url).toBeString();
            expect(url.length).toBeGreaterThan(0);
            expect(url).toBe(build.downloads.application.url);
        }, 30000);
    }
});
