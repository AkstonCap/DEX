import path from 'path';
import baseConfig from './webpack.config.babel';

const port = 24011;
const publicPath = `http://localhost:${port}/`;

const config = {
  ...baseConfig,
  devtool: 'eval-source-map',
  devServer: {
    port,
    devMiddleware: {
      publicPath,
    },
    compress: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    static: {
      directory: path.join(process.cwd(), 'dist'),
      watch: true,
    },
  },
};

export default config;
