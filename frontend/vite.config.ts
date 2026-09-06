import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  define: {
    'import.meta.env.VITE_JOURNEY_SERVICE_URL': JSON.stringify(process.env.VITE_JOURNEY_SERVICE_URL || 'http://localhost:8081'),
    'import.meta.env.VITE_ANALYTICS_SERVICE_URL': JSON.stringify(process.env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:8082'),
    'import.meta.env.VITE_AI_SERVICE_URL': JSON.stringify(process.env.VITE_AI_SERVICE_URL || 'http://localhost:8084'),
    'import.meta.env.VITE_CONNECTORS_SERVICE_URL': JSON.stringify(process.env.VITE_CONNECTORS_SERVICE_URL || 'http://localhost:8083')
  }
});
