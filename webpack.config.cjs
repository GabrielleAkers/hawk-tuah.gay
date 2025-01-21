const path = require('path');

module.exports = {
    entry: './src/app.mts',
    module: {
      rules: [
        {
          test: /\.mts/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js', '.mts'],
    },
    output: {
      filename: 'app.mjs',
      path: path.resolve(__dirname, 'built'),
    },
    cache: false
  };
