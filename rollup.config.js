const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const terser = require("@rollup/plugin-terser");
const { dts } = require("rollup-plugin-dts");
const pkg = require("./package.json");

module.exports = [
  // JavaScript bundle with no declarations
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.module,
        format: "esm",
        sourcemap: true
      },
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: true
      },
      {
        file: pkg.unpkg,
        format: "umd",
        name: "cios",
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        rootDir: "src"
      })
    ],
    external: [...Object.keys(pkg.dependencies || {})]
  },
  
  // Separate build only for type declarations
  {
    input: "src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        "declaration": true,
        "declarationDir": "dist/types"
      }),
      dts()
    ]
  }
];