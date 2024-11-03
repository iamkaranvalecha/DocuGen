// const path = require('path');
// const { spawn } = require('child_process');

// module.exports = (env, argv) => {
//   const mode = env === 'production' ? 'production' : 'development';

//   return {
//     // Entry point of your application
//     entry: './src/index.ts',

//     // Specify the output directory and filename
//     output: {
//       path: path.resolve(__dirname, 'devops-task'),
//       filename: 'bundle.js',
//     },

//     // Resolve the typescript dependency to handle ts compilation
//     resolve: {
//       extensions: ['.ts', '.js'],
//       fallback: {
//         fs: false,
//         path: require.resolve('path-browserify'),
//         os: require.resolve('os-browserify/browser'),
//         util: require.resolve('util/'),
//         child_process: false, // Ignore `child_process`
//       },
//     },

//     // Configure Webpack plugins for TypeScript compilation and bundling
//     module: {
//       rules: [
//         {
//             test: /\.ts$/,
//             use: 'ts-loader',
//             exclude: /node_modules/,
//           },
//       ],
//     },

//     // Enable Webpack Hot Module Replacement for development
//     devtool: mode === 'production' ? false : 'cheap-source-map',
//   };
// };

const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'devops-task')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  target: 'node',
  plugins: [
    new webpack.ContextReplacementPlugin(
      /azure-pipelines-task-lib/,
      path.resolve(__dirname, 'src')
    )
  ],
  ignoreWarnings: [/Can't resolve 'debug' in/]
}
