const { defineConfig } = require("vite");
const path = require("path");

module.exports = defineConfig({
  build: {
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/main.ts")
      },
      output: {
        entryFileNames: "module.js",
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name === "style") return "style.css";
          return chunkInfo.name + "[extname]";
        }
      }
    }
  }
});