import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), reactRouter()],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		proxy: {
			// Proxy `/api/*` from the browser (localhost:5173) to the
			// backend (localhost:3000) in dev. SSR uses `API_BASE_URL`
			// from `.env` — this proxy is for client-side `fetch` only
			// (SWR calls, form actions via `fetcher.submit`).
			//
			// The backend's CORS checks `Origin` against `FRONTEND_URL`
			// (currently `https://localhost:5173`). Vite dev runs on
			// `http://localhost:5173` (no TLS), so the proxy rewrites
			// the `Origin` header to match. If you change the backend's
			// `FRONTEND_URL` to `http://localhost:5173`, you can drop
			// the `configure` callback.
			'/api': {
				target: 'http://localhost:3000',
				configure: (proxy) => {
					proxy.on('proxyReq', (proxyReq) => {
						proxyReq.setHeader('Origin', 'https://localhost:5173');
					});
				},
			},
		},
	},
});
