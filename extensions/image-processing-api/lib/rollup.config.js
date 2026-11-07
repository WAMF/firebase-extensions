import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy';

export default {
  input: './src/index.ts',
  output: [
    {
      file: './dist/bundle.cjs.js',
      format: 'cjs',
    },
    {
      file: 'dist/bundle.es.js',
      format: 'es',
    },
  ],
  plugins: [
    // Explicit include: picomatch >=2.3.2 no longer matches rpt2's default '*.ts+(|x)' glob.
    typescript({ include: ['*.ts', '**/*.ts'] }),
    copy({
      targets: [{ src: 'src/types', dest: 'dist' }],
    }),
  ],
};
