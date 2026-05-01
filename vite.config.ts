import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/content/index.ts',
      formats: ['iife'],
      name: 'MagicCopy',
      fileName: () => 'content.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
