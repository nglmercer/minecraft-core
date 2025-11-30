import { MinecraftServerManager } from '../dist/index.js';
if (MinecraftServerManager) {
    console.log('ESM Import Success');
} else {
    console.error('ESM Import Failed');
    process.exit(1);
}
