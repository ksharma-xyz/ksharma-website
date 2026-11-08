import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 8899);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const sizes = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
} as const;

const projects = (Object.keys(sizes) as Array<keyof typeof sizes>).flatMap((size) =>
  (['light', 'dark'] as const).map((scheme) => ({
    name: `${size}-${scheme}`,
    use: {
      browserName: 'chromium' as const,
      viewport: sizes[size],
      colorScheme: scheme,
    },
  })),
);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  workers: process.env.UX_WORKERS ? Number(process.env.UX_WORKERS) : 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'off',
  },
  // cwd = tests/, so ../docs is the site root.
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory ../docs`,
    cwd: __dirname,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects,
});
