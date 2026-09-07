const path = require('node:path');
const webpackAliases = require('nexus-module/lib/webpackAliases').default;

module.exports = {
  mode: process.env.NODE_ENV,
  devtool: 'source-map',
  entry: { app: './src/index.js', 'solana-signer': './src/swap/signingPage.js' },
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: '[name].js',
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
      },
    ],
  },
  resolve: {
    alias: webpackAliases,
  },
};
