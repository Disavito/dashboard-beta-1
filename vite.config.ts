import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno basadas en el modo (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
        },
        manifest: {
          name: 'Dashboard FIMAGADI',
          short_name: 'FIMAGADI',
          description: 'Dashboard de Gestión',
          theme_color: '#0f172a',
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
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/reniec': 'http://localhost:3001'
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
              // 1. Herramientas de Excel (Muy pesadas, solo se cargan al exportar)
              if (id.includes('xlsx')) {
                return 'excel-utils';
              }
              // 2. Utilidades PDF
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-utils';
              }
              // 3. Gráficos
              if (id.includes('recharts')) {
                return 'charts';
              }
              // 4. Tablas y Fechas
              if (id.includes('ag-grid')) {
                return 'ag-grid';
              }
              if (id.includes('date-fns')) {
                return 'date-utils';
              }
              
              // Todo lo demás va a vendor
              return 'vendor';
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
