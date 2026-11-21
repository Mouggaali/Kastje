import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite bouwt en serveert de app; Vitest gebruikt dezelfde instellingen voor de tests.
export default defineConfig({
  plugins: [react()],
  // Relatieve paden, zodat de app ook werkt in een submap (zoals GitHub Pages: /Kastje/).
  base: './',
  test: {
    environment: 'node',
  },
});
