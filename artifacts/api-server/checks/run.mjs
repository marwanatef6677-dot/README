import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const entry = fileURLToPath(new URL("./ride-flow.ts", import.meta.url));
const out = fileURLToPath(new URL("../node_modules/.cache/pablo-ride-check.cjs", import.meta.url));
await build({
  stdin: { contents: `import("./ride-flow.ts")`, resolveDir: fileURLToPath(new URL(".", import.meta.url)) },
  outfile: out, bundle: true, platform: "node", format: "esm",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  external: ["pg-native"],
  plugins: [{
    name: "isolated-test-auth",
    setup(b) {
      b.onLoad({ filter: /middlewares\/auth\.ts$/ }, () => ({
        contents: `export const requirePabloAuth=(req,res,next)=>{const id=req.get("x-test-user");if(!id){res.status(401).json({error:"Unauthorized"});return;}res.locals.userId=id;next();}`,
        loader: "js",
      }));
    },
  }],
});
// ESM output needs an mjs extension for Node, including inside node_modules.
const { rename } = await import("node:fs/promises");
const esm = out.replace(/\.cjs$/, ".mjs");
await rename(out, esm);
const result = spawnSync(process.execPath, [esm], { stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
