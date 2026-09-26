import { defineConfig } from 'vite';

// Relative base so the built app works from any GitHub Pages project
// subpath (https://<user>.github.io/<repo>/) without hardcoding the repo
// name here. Override with an absolute base if you deploy elsewhere.
export default defineConfig({
  base: './',
});
