const { MinecraftServerManager } = require('../dist/index.cjs');
if (MinecraftServerManager) {
    console.log('CJS Require Success');
} else {
    console.error('CJS Require Failed');
    process.exit(1);
}
