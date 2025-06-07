import { build } from 'esbuild';

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  treeShaking: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: 'dist/index.cjs'
}).catch(err => {
  console.error(err);
  process.exit(1);
});
