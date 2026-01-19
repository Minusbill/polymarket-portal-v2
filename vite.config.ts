import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
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
