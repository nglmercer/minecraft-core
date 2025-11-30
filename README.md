# Minecraft Server Manager

A powerful, environment-agnostic TypeScript library for managing, searching, and downloading various Minecraft server cores. Built with modern web standards and designed to work seamlessly in Node.js, Bun, and other JavaScript runtimes.

## 🚀 Features

*   **Multi-Provider Support**: Unified API to interact with major Minecraft server providers.
*   **Environment Agnostic**: Uses a `FileSystemAdapter` pattern, making it compatible with Node.js, Bun, and potentially Deno or browsers (with appropriate adapters).
*   **Type-Safe**: Built with TypeScript and Zod for robust runtime validation.
*   **Hash Verification**: Automatically verifies downloaded artifacts (SHA256, MD5, SHA1) when available.
*   **Flexible**: Supports downloading binaries, installers, or fetching download paths depending on the provider.

## 📦 Installation

```bash
npm install minecraft-core
# or
bun add minecraft-core
# or
pnpm add minecraft-core
```

## 🛠️ Supported Providers

| Provider | Key | Status | Description |
| :--- | :--- | :---: | :--- |
| **Paper** | `paper` | ✅ Ready | High performance Spigot fork. |
| **Purpur** | `purpur` | ✅ Ready | Drop-in replacement for Paper with more features. |
| **Vanilla** | `vanilla` | ✅ Ready | Official Minecraft server software from Mojang. |
| **Fabric** | `fabric` | ✅ Ready | Lightweight, modular modding toolchain (downloads Launcher JAR). |
| **Forge** | `forge` | ✅ Ready | Massive modding API (downloads Installer JAR). |
| **Mohist** | `mohist` | ✅ Ready | Hybrid server (Forge + Spigot/Paper). |
| **Velocity** | `velocity` | ✅ Ready | The modern, high-performance Minecraft proxy. |
| **Folia** | `folia` | ✅ Ready | Regionized multithreading dedicated server. |
| **Waterfall**| `waterfall`| ✅ Ready | The BungeeCord fork by PaperMC. |
| **Magma** | `magma` | 🚧 Planned | Hybrid server (Forge + Spigot/Paper). |

## 📖 Usage

### 1. Initialization

You must provide a `FileSystemAdapter`. A `NodeAdapter` is provided out-of-the-box which works for Node.js and Bun.

```typescript
import { MinecraftServerManager, NodeAdapter } from 'minecraft-core';

// Initialize with the Node.js/Bun adapter
const manager = new MinecraftServerManager(new NodeAdapter());
```

### 2. Fetching Versions

Get a list of available Minecraft versions for a specific core.

```typescript
const versions = await manager.getVersions('paper');
console.log(versions); // ['1.8.8', ..., '1.20.4', '1.21']
```

### 3. Downloading a Server

Download the latest build for a specific version.

```typescript
try {
    const result = await manager.downloadServer({
        core: 'paper',
        version: '1.21',
        outputDir: './server',
        filename: 'server.jar' // Optional
    });

    console.log(`Downloaded to: ${result.path}`);
    console.log(`Hash: ${result.hash}`);
} catch (error) {
    console.error('Download failed:', error);
}
```

### 4. Advanced: Get Build Details

If you need specific build information before downloading.

```typescript
const build = await manager.getLatestBuild('purpur', '1.20.4');

console.log(`Build ID: ${build.buildId}`);
console.log(`Timestamp: ${build.timestamp}`);
console.log(`Download URL: ${build.downloads.application.url}`);
```

## 🧩 Adapters

This library uses the **Adapter Pattern** to handle file system operations. This allows you to use the library in environments where `fs` might not be available or behaves differently.

### Custom Adapter

Implement the `FileSystemAdapter` interface to create your own adapter:

```typescript
import type { FileSystemAdapter } from 'minecraft-core';

class MyCustomAdapter implements FileSystemAdapter {
    join(...paths: string[]): string { /* ... */ }
    mkdir(path: string): Promise<void> { /* ... */ }
    writeStream(path: string, stream: any): Promise<void> { /* ... */ }
    // ... implement other methods
}

const manager = new MinecraftServerManager(new MyCustomAdapter());
```

## 🧪 Testing

The project includes a comprehensive test suite using `bun test`.

```bash
# Run all tests
bun test

# Run type checking
bun run typecheck
```

## 📄 License

MIT
