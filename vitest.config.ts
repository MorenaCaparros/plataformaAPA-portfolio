import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/app/api/**/*.ts',
        'src/components/**/*.tsx',
      ],
      exclude: [
        'src/lib/supabase/**',
        'src/lib/google/**',
        'src/lib/pwa/**',
        'src/app/api/drive/**',
        'src/app/api/chat/**',
        'src/components/forms/VoiceRecorder.tsx',
        'src/components/forms/VoiceToText.tsx',
        'src/components/forms/DrawingRecorder.tsx',
        'src/components/OnlineStatusIndicator.tsx',
        'src/components/PWAInitializer.tsx',
        'src/components/layouts/**',
      ],
      thresholds: {
        // Umbrales incrementales — cubrir al menos lo que ya tenemos
        lines: 15,
        functions: 15,
        branches: 15,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

