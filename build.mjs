// npm run dev   -> serves the site on http://localhost:3000 and rebuilds when you edit src/
// npm run build -> makes the final assets/app.js
import * as esbuild from "esbuild";

const dev = process.argv.includes("--dev");

const options = {
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: !dev,
  sourcemap: dev,
  format: "iife",
  target: "es2019",
  jsx: "automatic",
  outfile: "assets/app.js",
  define: { "process.env.NODE_ENV": dev ? '"development"' : '"production"' },
  logLevel: "info"
};

if (dev) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: ".", port: 3000 });
  console.log("\nOpen http://localhost:" + port + "  (press Ctrl+C to stop)\n");
} else {
  await esbuild.build(options);
}
