import typescript from 'rollup-plugin-typescript2';

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
  // Explicit include: picomatch >=2.3.2 no longer matches rpt2's default '*.ts+(|x)' glob.
  plugins: [typescript({ include: ['*.ts', '**/*.ts'] })],
  external: ['firebase/functions'],
};
