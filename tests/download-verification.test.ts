import { describe, test, expect, mock } from "bun:test";
import { MinecraftServerManager } from "../src/MinecraftServerManager";
import type { FileSystemAdapter } from "../src/adapters/FileSystemAdapter";
import type { UnifiedBuild } from "../src/types";

// Helper to create a mock fetch response
function createMockFetchResponse(data: string) {
    return async () => ({
        ok: true,
        statusText: "OK",
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(data));
                controller.close();
            }
        }),
        json: async () => data,
        text: async () => data
    } as Response);
}

// Mock FileSystemAdapter with more detailed control
function createMockFs(options: {
    exists?: boolean;
    hash?: string;
    fileSize?: number;
    throwOnWrite?: boolean;
    throwOnHash?: boolean;
} = {}): FileSystemAdapter {
    return {
        join: (...paths) => paths.join("/"),
        mkdir: mock(async () => {}),
        writeStream: mock(async () => {
            if (options.throwOnWrite) {
                throw new Error("Write failed");
            }
        }),
        readFile: mock(async () => new Uint8Array()),
        deleteFile: mock(async () => {}),
        getFileSize: mock(async () => options.fileSize || 1024),
        calculateHash: mock(async () => {
            if (options.throwOnHash) {
                throw new Error("Hash calculation failed");
            }
            return options.hash || "mockhash";
        }),
        exists: mock(async () => options.exists ?? true),
        sep: "/",
    };
}

describe("Download Verification and Edge Cases", () => {
    
    test("should handle hash verification failure during download", async () => {
        const mockFs = createMockFs({ exists: false, hash: "wronghash" });
        const manager = new MinecraftServerManager(mockFs);

        const mockBuild: UnifiedBuild = {
            core: "paper",
            version: "1.20.4",
            buildId: "123",
            downloads: {
                application: {
                    name: "server.jar",
                    url: "https://example.com/server.jar",
                    hash: "correcthash",
                    hashType: "sha256",
                    downloadType: "binary",
                },
            },
        };

        // Mock the strategy
        const mockStrategy = {
            name: "Mock",
            baseUrl: "",
            getVersions: async () => ["1.20.4"],
            getBuilds: async () => [mockBuild],
            getLatestBuild: async () => mockBuild,
            getDownloadUrl: async () => "https://example.com/server.jar",
        };

        // Inject mock strategy
        (manager as any).strategies.set("paper", mockStrategy);

        // Mock global fetch to return content that will have wrong hash
        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse("mock content");

        try {
            await expect(
                manager.downloadServer({
                    core: "paper",
                    version: "1.20.4",
                    outputDir: "/tmp/mc",
                }),
            ).rejects.toThrow("Hash mismatch");

            // Should delete the file on hash mismatch
            expect(mockFs.deleteFile).toHaveBeenCalled();
            
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should handle file system errors during download", async () => {
        const mockFs = createMockFs({ exists: false, throwOnWrite: true });
        const manager = new MinecraftServerManager(mockFs);

        const mockBuild: UnifiedBuild = {
            core: "paper",
            version: "1.20.4",
            buildId: "123",
            downloads: {
                application: {
                    name: "server.jar",
                    url: "https://example.com/server.jar",
                    hash: "mockhash",
                    hashType: "sha256",
                    downloadType: "binary",
                },
            },
        };

        const mockStrategy = {
            name: "Mock",
            baseUrl: "",
            getVersions: async () => ["1.20.4"],
            getBuilds: async () => [mockBuild],
            getLatestBuild: async () => mockBuild,
            getDownloadUrl: async () => "https://example.com/server.jar",
        };

        (manager as any).strategies.set("paper", mockStrategy);

        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse("mock content");

        try {
            await expect(
                manager.downloadServer({
                    core: "paper",
                    version: "1.20.4",
                    outputDir: "/tmp/mc",
                }),
            ).rejects.toThrow("Write failed");

        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should handle hash calculation errors during verification", async () => {
        const mockFs = createMockFs({ exists: true, hash: "mockhash", throwOnHash: true });
        const manager = new MinecraftServerManager(mockFs);

        const mockBuild: UnifiedBuild = {
            core: "paper",
            version: "1.20.4",
            buildId: "123",
            downloads: {
                application: {
                    name: "server.jar",
                    url: "https://example.com/server.jar",
                    hash: "mockhash",
                    hashType: "sha256",
                    downloadType: "binary",
                },
            },
        };

        const mockStrategy = {
            name: "Mock",
            baseUrl: "",
            getVersions: async () => ["1.20.4"],
            getBuilds: async () => [mockBuild],
            getLatestBuild: async () => mockBuild,
            getDownloadUrl: async () => "https://example.com/server.jar",
        };

        (manager as any).strategies.set("paper", mockStrategy);

        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse("mock content");

        try {
            // Should re-download when hash calculation fails
            const result = await manager.downloadServer({
                core: "paper",
                version: "1.20.4",
                outputDir: "/tmp/mc",
            });

            expect(result.filename).toBe("server.jar");
            expect(mockFs.writeStream).toHaveBeenCalled(); // Should re-download
            
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should handle missing hash in build data", async () => {
        const mockFs = createMockFs({ exists: false });
        const manager = new MinecraftServerManager(mockFs);

        // Build without hash
        const mockBuild: UnifiedBuild = {
            core: "paper",
            version: "1.20.4",
            buildId: "123",
            downloads: {
                application: {
                    name: "server.jar",
                    url: "https://example.com/server.jar",
                    // No hash property
                    downloadType: "binary",
                },
            },
        };

        const mockStrategy = {
            name: "Mock",
            baseUrl: "",
            getVersions: async () => ["1.20.4"],
            getBuilds: async () => [mockBuild],
            getLatestBuild: async () => mockBuild,
            getDownloadUrl: async () => "https://example.com/server.jar",
        };

        (manager as any).strategies.set("paper", mockStrategy);

        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse("mock content");

        try {
            const result = await manager.downloadServer({
                core: "paper",
                version: "1.20.4",
                outputDir: "/tmp/mc",
            });

            expect(result.filename).toBe("server.jar");
            expect(result.hash).toBe(""); // Should have empty hash when not provided
            expect(mockFs.writeStream).toHaveBeenCalled();
            
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should handle different download types", async () => {
        const mockFs = createMockFs({ exists: false });
        const manager = new MinecraftServerManager(mockFs);

        // Test with installer type
        const mockBuild: UnifiedBuild = {
            core: "forge",
            version: "1.20.4",
            buildId: "installer",
            downloads: {
                application: {
                    name: "forge-installer.jar",
                    url: "https://example.com/forge-installer.jar",
                    hash: "installerhash",
                    hashType: "sha256",
                    downloadType: "installer",
                },
            },
        };

        const mockStrategy = {
            name: "Mock",
            baseUrl: "",
            getVersions: async () => ["1.20.4"],
            getBuilds: async () => [mockBuild],
            getLatestBuild: async () => mockBuild,
            getDownloadUrl: async () => "https://example.com/forge-installer.jar",
        };

        (manager as any).strategies.set("forge", mockStrategy);

        const originalFetch = global.fetch;
        (global as any).fetch = createMockFetchResponse("installer content");

        try {
            const result = await manager.downloadServer({
                core: "forge",
                version: "1.20.4",
                outputDir: "/tmp/mc",
            });

            expect(result.filename).toBe("forge-installer.jar");
            expect(result.downloadType).toBe("installer");
            expect(mockFs.writeStream).toHaveBeenCalled();
            
        } finally {
            global.fetch = originalFetch;
        }
    });

    test("should verify file with different hash types", async () => {
        const mockFs = createMockFs({ exists: true, hash: "sha1hashvalue" });
        const manager = new MinecraftServerManager(mockFs);

        // Test SHA1 verification
        const isValidSha1 = await manager.verifyFile(
            "/tmp/mc/server.jar",
            "sha1hashvalue",
            "sha1"
        );
        expect(isValidSha1).toBe(true);

        // Test SHA256 verification
        mockFs.calculateHash = mock(async () => "sha256hashvalue");
        const isValidSha256 = await manager.verifyFile(
            "/tmp/mc/server.jar",
            "sha256hashvalue",
            "sha256"
        );
        expect(isValidSha256).toBe(true);

        // Test MD5 verification
        mockFs.calculateHash = mock(async () => "md5hashvalue");
        const isValidMd5 = await manager.verifyFile(
            "/tmp/mc/server.jar",
            "md5hashvalue",
            "md5"
        );
        expect(isValidMd5).toBe(true);
    });

    test("should handle non-existent file in verifyFile", async () => {
        const mockFs = createMockFs({ exists: false });
        const manager = new MinecraftServerManager(mockFs);

        const isValid = await manager.verifyFile(
            "/tmp/mc/nonexistent.jar",
            "somehash",
            "sha256"
        );

        expect(isValid).toBe(false);
    });

    test("should get file info for existing file", async () => {
        const mockFs = createMockFs({ exists: true, hash: "filehash", fileSize: 2048 });
        const manager = new MinecraftServerManager(mockFs);

        const fileInfo = await manager.getFileInfo("/tmp/mc/server.jar", "sha256");

        expect(fileInfo).not.toBeNull();
        expect(fileInfo!.filename).toBe("server.jar");
        expect(fileInfo!.size).toBe(2048);
        expect(fileInfo!.hash).toBe("filehash");
        expect(fileInfo!.downloadType).toBe("binary");
    });

    test("should return null for non-existent file in getFileInfo", async () => {
        const mockFs = createMockFs({ exists: false });
        const manager = new MinecraftServerManager(mockFs);

        const fileInfo = await manager.getFileInfo("/tmp/mc/nonexistent.jar");

        expect(fileInfo).toBeNull();
    });
});