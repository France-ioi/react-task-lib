import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import {createRequire} from 'module';
import terser from "@rollup/plugin-terser";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import scss from 'rollup-plugin-scss';

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: true,
        interop: 'auto',
      },
    ],
    plugins: [
      // nodePolyfills(),
      peerDepsExternal(),
      resolve({preferBuiltins: true}),
      commonjs(),
      json(),
      typescript({ tsconfig: "./tsconfig.json" }),
      terser(),
      scss({
        fileName: 'index.css',
        outputStyle: "compressed"
      }),
    ],
  },
  {
    input: "dist/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    plugins: [dts()],
    external: [/\.s?css$/],
  },
];
