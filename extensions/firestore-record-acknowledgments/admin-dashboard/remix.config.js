/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  // Remix 2 defaults to an ESM server build; keep the CommonJS output that
  // `remix-serve` loaded under Remix 1.
  serverModuleFormat: 'cjs',
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
};
