import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno basadas en el modo (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // Inyecta un timestamp único en cada compilación (deploy) para forzar purga de cachés
      __APP_VERSION__: JSON.stringify(Date.now().toString()),
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'prompt',
        injectRegister: 'auto',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
        },
        manifest: {
          name: 'Dashboard FIMAGADI',
          short_name: 'FIMAGADI',
          description: 'Dashboard de Gestión',
          theme_color: '#373435',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
      // Pre-compress assets at build time so Express serves them without CPU overhead
      viteCompression({
        algorithm: 'gzip',
        threshold: 1024,  // Only compress files > 1KB
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001'
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
    build: {
      target: 'esnext', 
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Modulos pesados aislados de forma segura
              if (id.includes('xlsx')) return 'excel-utils';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('@react-pdf/renderer')) return 'pdf-utils';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('ag-grid')) return 'ag-grid';
              if (id.includes('date-fns')) return 'date-fns';
              if (id.includes('lucide-react')) return 'lucide-icons';
              if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) return 'forms';
              
              // Quitamos el fallback de 'vendor' y 'react-core' para dejar que Rollup maneje 
              // las dependencias compartidas automáticamente sin crear dependencias circulares.
            }
          },
        },
      },
    },
    preview: {
      host: true,
      allowedHosts: ['fimagadi-dashboard.mv7mvl.easypanel.host']
    },
  };
});
