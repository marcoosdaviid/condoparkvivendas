import { defineConfig } from "vite";
import parentConfig from "../artifacts/parking-app/vite.config";
import path from "path";

export default defineConfig({
  ...parentConfig,
  server: {
    ...parentConfig.server,
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
});
