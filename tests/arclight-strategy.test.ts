import { describe, test, expect } from "bun:test";
import { ArclightStrategy } from "../src/strategies/ArclightStrategy";

// Helper to create a mock fetch response
function createMockFetchResponse(data: any) {
    return async () => ({
        ok: true,
        statusText: "OK",
        json: async () => data,
        text: async () => JSON.stringify(data)
    } as Response);
}

describe("ArclightStrategy Version Detection", () => {
    const strategy = new ArclightStrategy();

    // Mock GitHub API response with problematic version formats
    const mockGitHubReleases = [
        {
            tag_name: "Trials/1.0.6",
            published_at: "2024-01-21T00:00:00Z",
            assets: [
                {
                    name: "arclight-forge-1.20.1-1.0.6.jar",
                    browser_download_url: "https://github.com/IzzelAliz/Arclight/releases/download/Trials/1.0.6/arclight-forge-1.20.1-1.0.6.jar",
                    size: 5460000
                }
            ]
        },
        {
            tag_name: "Trials/1.0.5",
            published_at: "2024-01-20T00:00:00Z",
            assets: [
                {
                    name: "arclight-forge-1.20.1-1.0.5.jar",
                    browser_download_url: "https://github.com/IzzelAliz/Arclight/releases/download/Trials/1.0.5/arclight-forge-1.20.1-1.0.5.jar",
                    size: 5450000
                }
            ]
        },
        {
            tag_name: "1.20.4-1.0.5",
            published_at: "2024-01-19T00:00:00Z",
            assets: [
                {
                    name: "arclight-forge-1.20.4-1.0.5.jar",
                    browser_download_url: "https://github.com/IzzelAliz/Arclight/releases/download/1.20.4-1.0.5/arclight-forge-1.20.4-1.0.5.jar",
                    size: 5440000
                }
            ]
        },
        {
            tag_name: "Arclight-1.18.2-1.0.0",
            published_at: "2023-12-01T00:00:00Z",
            assets: [
                {
                    name: "arclight-forge-1.18.2-1.0.0.jar",
                    browser_download_url: "https://github.com/IzzelAliz/Arclight/releases/download/Arclight-1.18.2-1.0.0/arclight-forge-1.18.2-1.0.0.jar",
                    size: 5000000
                }
            ]
        }
    ];

    test("should handle Trials/1.0.6 format correctly", async () => {
        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse(mockGitHubReleases);

        try {
            const versions = await strategy.getVersions("arclight");
            
            // Should extract Minecraft versions from the tags
            expect(versions).toContain("1.20.1"); // From Trials/1.0.6 and Trials/1.0.5
            expect(versions).toContain("1.20.4"); // From 1.20.4-1.0.5
            expect(versions).toContain("1.18.2"); // From Arclight-1.18.2-1.0.0
            
            console.log("Extracted versions:", versions);
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should get builds for version with Trials format", async () => {
        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse(mockGitHubReleases);

        try {
            const builds = await strategy.getBuilds("arclight", "1.20.1");
            
            expect(builds.length).toBeGreaterThan(0);
            const firstBuild = builds[0];
            expect(firstBuild).toBeDefined();
            expect(firstBuild!.core).toBe("arclight");
            expect(firstBuild!.version).toBe("1.20.1");
            expect(firstBuild!.buildId).toContain("1.0.6"); // Should get the latest build
            
            console.log("Builds for 1.20.1:", builds.map(b => ({ buildId: b.buildId, version: b.version })));
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should get latest build for version", async () => {
        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse(mockGitHubReleases);

        try {
            const latestBuild = await strategy.getLatestBuild("arclight", "1.20.1");
            
            expect(latestBuild.core).toBe("arclight");
            expect(latestBuild.version).toBe("1.20.1");
            expect(latestBuild.buildId).toBe("Trials/1.0.6"); // Should be the latest
            expect(latestBuild.downloads.application.name).toBe("arclight-forge-1.20.1-1.0.6.jar");
            
            console.log("Latest build:", latestBuild);
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should get download URL for build", async () => {
        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse(mockGitHubReleases);

        try {
            const downloadUrl = await strategy.getDownloadUrl(
                "arclight",
                "1.20.1",
                "Trials/1.0.6",
                "arclight-forge-1.20.1-1.0.6.jar"
            );
            
            expect(downloadUrl).toContain("arclight-forge-1.20.1-1.0.6.jar");
            expect(downloadUrl).toContain("Trials/1.0.6");
            
            console.log("Download URL:", downloadUrl);
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should handle edge cases in version extraction", async () => {
        const edgeCaseReleases = [
            { tag_name: "v1.20.1-1.0.6", published_at: "2024-01-21T00:00:00Z", assets: [] },
            { tag_name: "release-1.20.1-1.0.6", published_at: "2024-01-21T00:00:00Z", assets: [] },
            { tag_name: "1.20.1.1-1.0.6", published_at: "2024-01-21T00:00:00Z", assets: [] },
            { tag_name: "invalid-tag", published_at: "2024-01-21T00:00:00Z", assets: [] }
        ];

        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse(edgeCaseReleases);

        try {
            const versions = await strategy.getVersions("arclight");
            
            // Should still extract valid versions where possible
            expect(versions.length).toBeGreaterThan(0);
            console.log("Versions from edge cases:", versions);
        } finally {
            global.fetch = originalFetch;
        }
    });
});