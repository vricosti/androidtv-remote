const path = require('path');

module.exports = {
  mode: 'development', // Or 'production' or 'none'
  entry: './src/index.js',
  output: {
    path: path.resolve( __dirname, 'dist' ),
    filename: '[name].js',
    //libraryTarget: 'umd'
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
        "fs": false,
        // "os": require.resolve("os-browserify/browser"),
        // "http": require.resolve("stream-http"),
        // "https": require.resolve("https-browserify"),
        "crypto": require.resolve("crypto-browserify"),
        "buffer": require.resolve("buffer"),
        "stream": require.resolve("stream-browserify"),
        // "net": false,
        // "tls": false,
        // "child_process": false
      }
  },
  //target: 'web'
};
