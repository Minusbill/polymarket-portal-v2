import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "local-binance-withdraw",
      configureServer(server) {
        server.middlewares.use("/api/binance-withdraw", async (req, res) => {
          try {
            const module = await import("./api/binance-withdraw.js");
            const handler = module.default;
            await handler(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
          }
        });
      },
    },
    {
      name: "local-binance-assets",
      configureServer(server) {
        server.middlewares.use("/api/binance-assets", async (req, res) => {
          try {
            const module = await import("./api/binance-assets.js");
            const handler = module.default;
            await handler(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
          }
        });
      },
    },
    {
      name: "local-binance-balances",
      configureServer(server) {
        server.middlewares.use("/api/binance-balances", async (req, res) => {
          try {
            const module = await import("./api/binance-balances.js");
            const handler = module.default;
            await handler(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
          }
        });
      },
    },
    {
      name: "local-public-ip",
      configureServer(server) {
        server.middlewares.use("/api/public-ip", async (req, res) => {
          try {
            const module = await import("./api/public-ip.js");
            const handler = module.default;
            await handler(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    proxy: {
      "/api/market": {
        target: "https://gamma-api.polymarket.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/market/, "/markets"),
      },
      "/api/profile": {
        target: "https://gamma-api.polymarket.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/profile/, "/public-profile"),
      },
      "/api/book": {
        target: "https://clob.polymarket.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/book/, "/book"),
      },
      "/api/positions": {
        target: "https://data-api.polymarket.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/positions/, "/positions"),
      },
      "/api/bridge": {
        target: "https://bridge.polymarket.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bridge/, "/deposit"),
      },
      "/api/leaderboard": {
        target: "https://data-api.polymarket.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/leaderboard/, "/v1/leaderboard"),
      },
      "/api/rpc1": {
        target: "https://poly.api.pocket.network",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc1/, "/"),
      },
      "/api/rpc2": {
        target: "https://rpc-mainnet.matic.quiknode.pro",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc2/, "/"),
      },
    },
  },
});
