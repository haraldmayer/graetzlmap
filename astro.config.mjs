// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

const isProduction = process.env.NODE_ENV === 'production';

// https://astro.build/config
export default defineConfig({
  output: isProduction ? 'static' : 'server',
  adapter: isProduction ? undefined : node({
    mode: 'standalone'
  })
});
