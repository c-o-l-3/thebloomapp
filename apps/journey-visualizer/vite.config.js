import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// Performance Optimized Vite Configuration
// Targets: Sub-2s load times, CDN-ready assets, optimal caching

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer for production builds
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  
  server: {
    port: 3000,
    open: true,
    // Enable compression in dev for testing
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    
    // Optimize chunk size for caching
    chunkSizeWarningLimit: 500,
    
    // Code splitting strategy
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Core React vendor chunk
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI Components chunk
          'vendor-ui': ['lucide-react', 'react-quill', '@monaco-editor/react'],
          
          // Data visualization and flow
          'vendor-flow': ['reactflow'],
          
          // Date utilities
          'vendor-utils': ['date-fns'],
          
          // Email/Content editing
          'vendor-editor': ['grapesjs'],
        },
        
        // Asset naming for CDN caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          
          // Organize assets by type for CDN optimization
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Enable brotli compression pre-computation
    reportCompressedSize: true,
  },
  
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'date-fns',
    ],
    exclude: [],
  },
  
  // Experimental features for performance
  experimental: {
    // Enable render built time optimization
    renderBuiltUrl(filename, { hostType }) {
      // CDN configuration - can be overridden by env vars
      if (process.env.CDN_URL && hostType === 'js') {
        return `${process.env.CDN_URL}/${filename}`
      }
      return { relative: true }
    },
  },
  
  // Define env variables for build
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}))
