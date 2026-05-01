import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';

const browser = (process.env.BROWSER ?? 'firefox') as 'firefox' | 'chrome';
const outDir = `dist/${browser}`;

export default defineConfig({
  build: {
    lib: {
      entry: 'src/content/index.ts',
      formats: ['iife'],
      name: 'MagicCopy',
      fileName: () => 'content.js',
    },
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: false,
  },
  plugins: [
    {
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync(`manifest.${browser}.json`, `${outDir}/manifest.json`);
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
