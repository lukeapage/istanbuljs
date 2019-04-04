import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import replace from 'rollup-plugin-replace';

module.exports = {
    input: 'src/index.js',
    output: {
        file: 'assets/bundle.js',
        format: 'iife',
        banner: '/* eslint-disable */\n'
    },
    plugins: [
        babel({
            exclude: 'node_modules/**'
        }),
        resolve(),
        commonjs({
            namedExports: {
                'react/index.js': [
                    'createElement',
                    'Fragment',
                    'useState',
                    'useMemo'
                ],
                'react-dom/index.js': ['render']
            }
        }),
        replace({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        // use fast minify mode https://github.com/terser-js/terser#terser-fast-minify-mode
        terser({ compress: false, mangle: true })
    ]
};
