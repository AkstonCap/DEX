import path from 'path';
import webpack from 'webpack';
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
    hot: true, // Enable hot module replacement
  },
  plugins: [
    ...(baseConfig.plugins || []), // Ensure plugins is an array
    new webpack.HotModuleReplacementPlugin(), // Add hot module replacement plugin
  ],
};

export default config;
