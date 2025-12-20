import { describe, test, expect } from "bun:test";
import { ArclightStrategy } from "../src/strategies/ArclightStrategy";
import { MohistStrategy } from "../src/strategies/MohistStrategy";

// Helper to create a mock fetch response
function createMockFetchResponse(data: any) {
    return async () => ({
        ok: true,
        statusText: "OK",
        json: async () => data,
        text: async () => JSON.stringify(data)
    } as Response);
}

describe("GitHub-based Strategies Version Detection", () => {
    
    describe("ArclightStrategy - Complex GitHub Tag Formats", () => {
        const strategy = new ArclightStrategy();

        test("should extract versions from various GitHub tag formats", async () => {
            const complexReleases = [
                // Trials format (the problematic one)
                { tag_name: "Trials/1.0.6", published_at: "2024-01-21T00:00:00Z", assets: [{ name: "arclight.jar", browser_download_url: "url1", size: 1000 }] },
                { tag_name: "Trials/1.0.5", published_at: "2024-01-20T00:00:00Z", assets: [{ name: "arclight.jar", browser_download_url: "url2", size: 1000 }] },
                
                // Standard format
                { tag_name: "1.20.4-1.0.4", published_at: "2024-01-19T00:00:00Z", assets: [{ name: "arclight.jar", browser_download_url: "url3", size: 1000 }] },
                { tag_name: "1.20.1-1.0.3", published_at: "2024-01-18T00:00:00Z", assets: [{ name: "arclight.jar", browser_download_url: "url4", size: 1000 }] },
                
                // Arclight prefix format
                { tag_name: "Arclight-1.18.2-1.0.2", published_at: "2024-01-17T00:00:00Z", assets: [{ name: "arclight.jar", browser_download_url: "url5", size: 1000 }] },
                { tag_name: "Arclight-1.16.5-1.0.1", published_at: "2024-01-16T00:00:00Z", assets: [{ name: "arclight.jar", browser_download_url: "url6", size: 1000 }] },
                
                // Edge cases that should be ignored or handled gracefully
                { tag_name: "v1.0.0", published_at: "2024-01-15T00:00:00Z", assets: [] },
                { tag_name: "latest", published_at: "2024-01-14T00:00:00Z", assets: [] },
                { tag_name: "invalid-tag-format", published_at: "2024-01-13T00:00:00Z", assets: [] }
            ];

            const originalFetch = global.fetch;
            (global as any).fetch = createMockFetchResponse(complexReleases);

            try {
                const versions = await strategy.getVersions("arclight");
                
                console.log("Extracted versions from complex formats:", versions);
                
                // Should extract valid Minecraft versions
                expect(versions).toContain("1.20.4");
                expect(versions).toContain("1.20.1");
                expect(versions).toContain("1.18.2");
                expect(versions).toContain("1.16.5");
                
                // Should not include invalid versions
                expect(versions).not.toContain("1.0.0"); // This is the Arclight version, not Minecraft version
                expect(versions).not.toContain("latest");
                expect(versions).not.toContain("invalid-tag-format");
                
            } finally {
                global.fetch = originalFetch;
            }
        });

        test("should handle empty or malformed responses gracefully", async () => {
            const malformedReleases = [
                { tag_name: "", published_at: "2024-01-21T00:00:00Z", assets: [] },
                { tag_name: null, published_at: "2024-01-21T00:00:00Z", assets: [] },
                { published_at: "2024-01-21T00:00:00Z", assets: [] }, // Missing tag_name
                { tag_name: "completely-invalid-format-with-no-version", published_at: "2024-01-21T00:00:00Z", assets: [] }
            ];

            const originalFetch = global.fetch;
            (global as any).fetch = createMockFetchResponse(malformedReleases);

            try {
                const versions = await strategy.getVersions("arclight");
                
                // Should return empty array or handle gracefully without crashing
                expect(Array.isArray(versions)).toBe(true);
                console.log("Versions from malformed data:", versions);
                
            } finally {
                global.fetch = originalFetch;
            }
        });

        test("should get correct builds filtering by Minecraft version", async () => {
            const mixedReleases = [
                {
                    tag_name: "Trials/1.0.6",
                    published_at: "2024-01-21T00:00:00Z",
                    assets: [{ name: "arclight-forge-1.20.1-1.0.6.jar", browser_download_url: "url1", size: 5460000 }]
                },
                {
                    tag_name: "1.20.4-1.0.5",
                    published_at: "2024-01-20T00:00:00Z",
                    assets: [{ name: "arclight-forge-1.20.4-1.0.5.jar", browser_download_url: "url2", size: 5440000 }]
                },
                {
                    tag_name: "Arclight-1.18.2-1.0.4",
                    published_at: "2024-01-19T00:00:00Z",
                    assets: [{ name: "arclight-forge-1.18.2-1.0.4.jar", browser_download_url: "url3", size: 5000000 }]
                }
            ];

            const originalFetch = global.fetch;
            (global as any).fetch = createMockFetchResponse(mixedReleases);

            try {
                // Test getting builds for specific versions
                const builds_1_20_1 = await strategy.getBuilds("arclight", "1.20.1");
                const builds_1_20_4 = await strategy.getBuilds("arclight", "1.20.4");
                const builds_1_18_2 = await strategy.getBuilds("arclight", "1.18.2");
                
                console.log("Builds for 1.20.1:", builds_1_20_1.length);
                console.log("Builds for 1.20.4:", builds_1_20_4.length);
                console.log("Builds for 1.18.2:", builds_1_18_2.length);
                
                expect(builds_1_20_1.length).toBeGreaterThan(0);
                expect(builds_1_20_4.length).toBeGreaterThan(0);
                expect(builds_1_18_2.length).toBeGreaterThan(0);
                
                // Verify the builds have correct data
                const firstBuild = builds_1_20_1[0];
                expect(firstBuild).toBeDefined();
                expect(firstBuild!.version).toBe("1.20.1");
                expect(firstBuild!.downloads.application.name).toContain("1.20.1");
                
            } finally {
                global.fetch = originalFetch;
            }
        });
    });

    describe("MohistStrategy - Another GitHub-based Strategy", () => {
        const strategy = new MohistStrategy();

        test("should handle Mohist-specific GitHub tag formats", async () => {
            const mohistReleases = [
                {
                    tag_name: "1.20.1-65",
                    published_at: "2024-01-21T00:00:00Z",
                    assets: [{ name: "mohist-1.20.1-65-server.jar", browser_download_url: "url1", size: 30000000 }]
                },
                {
                    tag_name: "1.20.1-64",
                    published_at: "2024-01-20T00:00:00Z",
                    assets: [{ name: "mohist-1.20.1-64-server.jar", browser_download_url: "url2", size: 29900000 }]
                },
                {
                    tag_name: "1.16.5-1.0.0",
                    published_at: "2023-12-01T00:00:00Z",
                    assets: [{ name: "mohist-1.16.5-1.0.0-server.jar", browser_download_url: "url3", size: 25000000 }]
                }
            ];

            const originalFetch = global.fetch;
            (global as any).fetch = createMockFetchResponse(mohistReleases);

            try {
                const versions = await strategy.getVersions("mohist");
                const builds = await strategy.getBuilds("mohist", "1.20.1");
                
                console.log("Mohist versions:", versions);
                console.log("Mohist builds for 1.20.1:", builds.length);
                
                expect(versions).toContain("1.20.1");
                expect(versions).toContain("1.16.5");
                expect(builds.length).toBeGreaterThan(0);
                
            } finally {
                global.fetch = originalFetch;
            }
        });
    });
});