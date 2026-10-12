import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Opens the connection to the API host while the JS bundle is still downloading. */
function preconnectApi(apiBaseUrl: string | undefined): Plugin {
  return {
    name: 'preconnect-api',
    transformIndexHtml() {
      if (!apiBaseUrl) return []
      let origin: string
      try {
        origin = new URL(apiBaseUrl).origin
      } catch {
        return []
      }
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' }]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), preconnectApi(env.VITE_API_BASE_URL)],
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
