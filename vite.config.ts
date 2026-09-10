import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	const base_url = env.VITE_API_BASE_URL || "http://localhost:3000";
	const frontend_origin = env.VITE_FRONTEND_ORIGIN || "http://localhost:5173";

	return {
		plugins: [tailwindcss(), reactRouter()],
		resolve: {
			tsconfigPaths: true,
		},
		server: {
			proxy: {
				"/api": {
					target: base_url,
					configure: (proxy) => {
						proxy.on("proxyReq", (proxyReq) => {
							proxyReq.setHeader("Origin", frontend_origin);
						});
					},
				},
			},
		},
	};
});
