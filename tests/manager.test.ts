import { describe, test, expect, mock, beforeAll, afterAll } from "bun:test";
import { MinecraftServerManager } from "../src/MinecraftServerManager";
import type { FileSystemAdapter } from "../src/adapters/FileSystemAdapter";
import type { ServerCore, UnifiedBuild } from "../src/types";

// Mock FileSystemAdapter
const mockFs: FileSystemAdapter = {
  join: (...paths) => paths.join("/"),
  mkdir: mock(async () => {}),
  writeStream: mock(async () => {}),
  readFile: mock(async () => new Uint8Array()),
  deleteFile: mock(async () => {}),
  getFileSize: mock(async () => 1024),
  calculateHash: mock(async () => "mockhash"),
  exists: mock(async () => true),
  sep: "/",
};

describe("MinecraftServerManager Logic", () => {
  const manager = new MinecraftServerManager(mockFs);

  test("downloadServer should download and verify hash", async () => {
    // Mock getLatestBuild to return a predictable build
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

    // Mock global fetch
    const originalFetch = global.fetch;
    //@ts-ignore
    global.fetch = mock(async () => new Response("mock content"));

    try {
      const result = await manager.downloadServer({
        core: "paper",
        version: "1.20.4",
        outputDir: "/tmp/mc",
      });

      expect(result.filename).toBe("server.jar");
      expect(result.path).toBe("/tmp/mc/server.jar");
      expect(mockFs.mkdir).toHaveBeenCalledWith("/tmp/mc");

      // Since file exists and has correct hash, writeStream should not be called
      expect(mockFs.writeStream).not.toHaveBeenCalled();

      // But hash calculation should be called to verify the existing file
      expect(mockFs.calculateHash).toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("downloadServer should fail on hash mismatch", async () => {
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

    const mockStrategy = {
      name: "Mock",
      baseUrl: "",
      getVersions: async () => ["1.20.4"],
      getBuilds: async () => [mockBuild],
      getLatestBuild: async () => mockBuild,
      getDownloadUrl: async () => "https://example.com/server.jar",
    };

    (manager as any).strategies.set("paper", mockStrategy);

    // Mock fs to return wrong hash
    const originalCalcHash = mockFs.calculateHash;
    mockFs.calculateHash = mock(async () => "wronghash");

    const originalFetch = global.fetch;
    //@ts-ignore
    global.fetch = mock(async () => new Response("mock content"));

    try {
      await expect(
        manager.downloadServer({
          core: "paper",
          version: "1.20.4",
          outputDir: "/tmp/mc",
        }),
      ).rejects.toThrow("Hash mismatch");

      expect(mockFs.deleteFile).toHaveBeenCalled();
      // With hash mismatch, writeStream should be called to re-download
      expect(mockFs.writeStream).toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
      mockFs.calculateHash = originalCalcHash;
    }
  });

  test("downloadServer should download when file doesn't exist", async () => {
    // Mock getLatestBuild to return a predictable build
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

    // Mock file doesn't exist
    const originalExists = mockFs.exists;
    mockFs.exists = mock(async () => false);

    // Mock global fetch
    const originalFetch = global.fetch;
    //@ts-ignore
    global.fetch = mock(async () => new Response("mock content"));

    try {
      const result = await manager.downloadServer({
        core: "paper",
        version: "1.20.4",
        outputDir: "/tmp/mc",
      });

      expect(result.filename).toBe("server.jar");
      expect(result.path).toBe("/tmp/mc/server.jar");
      expect(mockFs.mkdir).toHaveBeenCalledWith("/tmp/mc");
      // Since file doesn't exist, writeStream should be called
      expect(mockFs.writeStream).toHaveBeenCalled();
      expect(mockFs.calculateHash).toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
      mockFs.exists = originalExists;
    }
  });

  test("downloadServer should force download even when file exists", async () => {
    // Mock getLatestBuild to return a predictable build
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

    // Mock global fetch
    const originalFetch = global.fetch;
    //@ts-ignore
    global.fetch = mock(async () => new Response("mock content"));

    try {
      const result = await manager.downloadServer({
        core: "paper",
        version: "1.20.4",
        outputDir: "/tmp/mc",
        forceDownload: true,
      });

      expect(result.filename).toBe("server.jar");
      expect(result.path).toBe("/tmp/mc/server.jar");
      expect(mockFs.mkdir).toHaveBeenCalledWith("/tmp/mc");
      // Since forceDownload is true, writeStream should be called even if file exists
      expect(mockFs.writeStream).toHaveBeenCalled();
      expect(mockFs.calculateHash).toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("verifyFile should check file integrity", async () => {
    // Test with existing file and matching hash
    expect(await manager.verifyFile("/tmp/mc/server.jar", "mockhash")).toBe(
      true,
    );

    // Test with existing file but wrong hash
    const originalCalcHash = mockFs.calculateHash;
    mockFs.calculateHash = mock(async () => "wronghash");
    expect(await manager.verifyFile("/tmp/mc/server.jar", "correcthash")).toBe(
      false,
    );
    mockFs.calculateHash = originalCalcHash;

    // Test with non-existing file
    const originalExists = mockFs.exists;
    mockFs.exists = mock(async () => false);
    expect(await manager.verifyFile("/tmp/mc/nonexistent.jar")).toBe(false);
    mockFs.exists = originalExists;
  });

  test("getFileInfo should return file information", async () => {
    const result = await manager.getFileInfo("/tmp/mc/server.jar");

    expect(result).not.toBeNull();
    expect(result!.filename).toBe("server.jar");
    expect(result!.path).toBe("/tmp/mc/server.jar");
    expect(result!.size).toBe(1024);
    expect(result!.hash).toBe("mockhash");
    expect(result!.downloadType).toBe("binary");

    // Test with non-existing file
    const originalExists = mockFs.exists;
    mockFs.exists = mock(async () => false);
    expect(await manager.getFileInfo("/tmp/mc/nonexistent.jar")).toBeNull();
    mockFs.exists = originalExists;
  });
});
