import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import terser from "@rollup/plugin-terser";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import scss from 'rollup-plugin-scss';

export default [
  {
    input: "src/index.ts",
    output: [
      {
        dir: "dist",
        entryFileNames: "index.js",
        format: "cjs",
        sourcemap: true,
        interop: 'auto',
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({preferBuiltins: true}),
      commonjs(),
      json(),
      terser(),
      scss({
        fileName: 'index.css',
        outputStyle: "compressed"
      }),
      typescript({ tsconfig: "./tsconfig.json", declarationDir: "dist/types" }),
    ],
  },
  {
    input: "dist/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    plugins: [dts()],
    external: [/\.s?css$/],
  },
];
