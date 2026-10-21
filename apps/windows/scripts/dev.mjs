// Live preview of the Windows app: Vite's dev server for the page, and Electron showing it, so a
// saved change appears in the window at once. Closing the window stops both. `npm run windows:dev`.
// Changes to src/main/ need the window closed and the command run again.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const APP = fileURLToPath(new URL("..", import.meta.url));

const server = await createServer({ configFile: `${APP}vite.config.ts`, server: { host: "127.0.0.1" } });
await server.listen();
const url = server.resolvedUrls.local[0];
server.printUrls();

// In Node, the electron package exports the path to Electron's executable.
const electron = createRequire(import.meta.url)("electron");
const child = spawn(electron, ["."], { cwd: APP, stdio: "inherit", env: { ...process.env, UOM_DEV_URL: url } });
child.on("exit", async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
