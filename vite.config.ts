import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发代理：浏览器请求 /api/paas/v4/... 时，由 Vite Dev Server 转发到
// https://open.bigmodel.cn/api/paas/v4/...，规避浏览器 CORS 限制。
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://open.bigmodel.cn",
        changeOrigin: true,
      },
    },
  },
});
