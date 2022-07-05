import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import cleanup from "rollup-plugin-cleanup";

const plugins = [
  typescript({
    target: "es6",
    module: "es2020",
    declaration: false,
    declarationDir: undefined,
  }),
  resolve(),
  commonjs(),
  cleanup({ comments: "none" }),
];
export default [
  {
    input: {
      index: "./src/index.ts",
      example: "./src/example.ts",
    },
    output: {
      dir: "./dist/dom",
      format: "es",
      manualChunks: {
        index: ["src/index.ts", "src/domain/index.ts", "src/dsl/index.ts"],
      },
    },
    plugins,
  },
  {
    input: {
      index: "./out/index.d.ts",
      example: "./out/example.d.ts",
    },
    output: {
      dir: "./dist/dom",
      format: "es",
      manualChunks: {
        index: [
          "out/index.d.ts",
          "out/domain/index.d.ts",
          "out/dsl/index.d.ts",
        ],
      },
    },
    plugins: [dts()],
  },
];
