import esbuild from 'esbuild';

async function build() {
  await esbuild.build({
    entryPoints: ['src/index.ts', 'src/push-engine.ts'],
    bundle: true,        // INI PENTING: Masukin semua node_modules ke bundle
    platform: 'node',    // Targetnya harus node
    target: 'node22',    // Samain sama versi runner GitHub Action
    format: 'esm',
    outdir: 'dist',
    minify: true,
    sourcemap: false,
    external: [],        // KOSONGIN: Biar dia "nelen" semua dep ke dalem bundle
  });
}

build().catch(() => process.exit(1));
