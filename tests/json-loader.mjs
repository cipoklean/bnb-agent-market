// tests/json-loader.mjs — minimal Node ESM loader for the offline harnesses.
// 1. resolve hook: extensionless relative imports from .ts importers (e.g.
//    "./scan-server" inside directory-cache.ts) retry with .ts/.tsx appended,
//    mirroring how the Next bundler resolves them. Lets lib modules that use
//    extensionless imports (all of apps/web/src/lib) be imported under
//    --experimental-strip-types too.
// 2. load hook: serves .json files as ES modules (default export = parsed
//    JSON), so directory-cache's static snapshot import works in Node.
// Run: node --experimental-strip-types --experimental-loader ./tests/json-loader.mjs ...
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (
      err?.code === "ERR_MODULE_NOT_FOUND" &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context?.parentURL
    ) {
      // Windows note: URL.pathname is "/C:/..." — fs needs the fileURLToPath
      // form, while next() needs the file:// URL again.
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const ext of [".ts", ".tsx"]) {
        if (existsSync(base + ext)) {
          return next(pathToFileURL(base + ext).href, context);
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, next) {
  if (url.endsWith(".json")) {
    const text = await readFile(new URL(url), "utf8");
    return {
      format: "module",
      source: `export default ${text};`,
      shortCircuit: true,
    };
  }
  return next(url, context);
}
