import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function prometheusMetricsPlugin() {
  return {
    name: 'prometheus-metrics-endpoint',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/actuator/prometheus' || req.url === '/metrics') {
          res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
          res.end(
            '# HELP frontend_up Whether the frontend Vite server is running\n' +
            '# TYPE frontend_up gauge\n' +
            'frontend_up 1\n' +
            '# HELP http_server_requests_seconds_count Simulated frontend requests\n' +
            '# TYPE http_server_requests_seconds_count counter\n' +
            'http_server_requests_seconds_count{service="frontend",uri="/"} 1\n'
          );
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), prometheusMetricsPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/dev': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2/authorization': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/actuator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth-health': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-health/, '/actuator/health'),
      },
      '/oauth2': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/.well-known': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
});
