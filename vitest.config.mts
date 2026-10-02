import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// .mts so vite loads this as ESM (a .ts config is loaded as CJS here, since the
// package is not type:module - and making it one would break the Next config files).
const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot),
      // `server-only` throws by design on any condition except "react-server", which
      // is what guards the service-role key from client imports. Point it at the
      // package's own empty module so server modules are testable in plain Node,
      // without broadly overriding resolve conditions for every other package.
      "server-only": path.resolve(projectRoot, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
