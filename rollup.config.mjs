import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import {createRequire} from 'module';
import terser from "@rollup/plugin-terser";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import scss from 'rollup-plugin-scss';
import nodePolyfills from 'rollup-plugin-polyfill-node';

const packageJson = createRequire(import.meta.url)("./package.json");

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
      peerDepsExternal(),
      nodePolyfills({ include: ['buffer'] }),
      resolve({browser: true, preferBuiltins: false}),
      commonjs(),
      json(),
      terser(),
      scss({
        fileName: 'index.css',
        outputStyle: "compressed"
      }),
      typescript({ tsconfig: "./tsconfig.json" }),
    ],
  },
];
