import esbuild from 'esbuild';

async function build() {
  await esbuild.build({
    entryPoints: ['src/index.ts', 'src/push-engine.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outdir: 'dist',
    minify: true,
    sourcemap: false,
    packages: 'external',
    banner: {
      js: `
        import { fileURLToPath } from 'url';
        import { dirname } from 'path';
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
      `,
    },
  });
}

build().catch(() => process.exit(1));
