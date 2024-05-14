const path = require('path');

module.exports = {
  mode: 'production', // Or 'production' or 'none'
  entry: './src/index.js',
  output: {
    path: path.resolve( __dirname, 'dist' ),
    filename: 'index.js',
    library: 'AndroidTvRemote',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  externals: {
    'tls': 'commonjs tls'  // Tells Webpack to treat `tls` as a commonjs module which is external
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.proto$/,
        use: 'raw-loader'
      }
    ]
  },
  resolve: {
    fallback: {
        "tls": false,
        // "crypto": require.resolve("crypto-browserify"),
        // "buffer": require.resolve("buffer"),
        // "stream": require.resolve("stream-browserify"),
      }
  },
  //target: 'web'
};
