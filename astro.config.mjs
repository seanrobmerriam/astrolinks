// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Pages render on each request so they always show the current config file.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()]
  }
});
