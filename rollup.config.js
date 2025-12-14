import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import metablock from 'rollup-plugin-userscript-metablock';

const isProduction = process.env.NODE_ENV === 'production';

// Tampermonkey metadata
const metadata = {
  name: 'WaniKani Review Story Generator',
  namespace: 'karsten.wanikani.story',
  version: '5.0',
  description: 'Collect vocab during reviews and generate a story afterward',
  author: 'Karsten Rohweder',
  match: 'https://www.wanikani.com/*',
  grant: [
    'GM_getValue',
    'GM_setValue',
    'GM_registerMenuCommand'
  ],
  'run-at': 'document-end'
};

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/wkstory.user.js',
    format: 'iife',
    sourcemap: isProduction ? false : 'inline',
    banner: isProduction ? '' : '/* WaniKani Story Generator - Development Build */'
  },
  plugins: [
    resolve(),
    metablock({ file: './package.json', override: metadata }),
    ...(isProduction ? [terser({
      format: {
        comments: /^!/,
        preamble: '// WaniKani Review Story Generator v5.0'
      }
    })] : [])
  ]
};
