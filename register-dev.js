const typescriptNode = require('ts-node')
const tsconfigPaths = require('tsconfig-paths');

typescriptNode.register({
    transpileOnly: true,
    project: './tsconfig.json',
    files: false
})

tsconfigPaths.register();
