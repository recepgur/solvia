import { Configuration, ProvidePlugin, NormalModuleReplacementPlugin } from 'webpack';
import { ConfigurationContext, createExpoWebpackConfigAsync } from '@expo/webpack-config';
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import path from 'path';

interface WebpackConfiguration extends Configuration {
  devServer?: DevServerConfiguration;
}

export default async function (env: ConfigurationContext, argv: any): Promise<WebpackConfiguration> {
  const config = await createExpoWebpackConfigAsync({
    ...env as any,
    babel: {
      dangerouslyLinkNativeLibraries: true,
      plugins: [
        ['@babel/plugin-proposal-export-namespace-from'],
        ['react-native-web', { commonjs: true }]
      ]
    }
  }, argv) as WebpackConfiguration;

  if (!config.resolve) {
    config.resolve = {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.web.js', '.web.tsx'],
      fallback: {},
      alias: {}
    };
  }

  // Add comprehensive polyfills
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    util: require.resolve('util/'),
    url: require.resolve('url/'),
    assert: require.resolve('assert/'),
    os: require.resolve('os-browserify/browser'),
    https: require.resolve('https-browserify'),
    http: require.resolve('stream-http'),
    zlib: require.resolve('browserify-zlib'),
    path: require.resolve('path-browserify'),
    fs: false,
    net: false,
    tls: false,
    child_process: false
  };

  // Add module resolution and aliases
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@screens': path.resolve(__dirname, 'src/screens'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@constants': path.resolve(__dirname, 'src/constants'),
    '@services': path.resolve(__dirname, 'src/services'),
    '@types': path.resolve(__dirname, 'src/types'),
    'react-native$': 'react-native-web',
    'react-native/Libraries/vendor/emitter/EventEmitter': 'eventemitter3',
    '@solana/web3.js': path.resolve(__dirname, 'node_modules/@solana/web3.js/lib/index.browser.esm.js'),
    'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter': 'eventemitter3',
    'react-native/Libraries/vendor/emitter/EventSubscriptionVendor': 'eventemitter3'
  };

  // Handle entry points with polyfills
  const entry = config.entry;
  config.entry = async () => {
    const entries = await (typeof entry === 'function' ? entry() : entry);
    const entryArray = Array.isArray(entries) ? entries :
      typeof entries === 'string' ? [entries] :
      entries ? Object.values(entries) : [];

    return {
      app: [
        require.resolve('./src/polyfills.ts'),
        ...(entryArray as string[])
      ]
    };
  };

  // Add webpack plugins for global variables and polyfills
  if (!config.plugins) {
    config.plugins = [];
  }

  config.plugins.push(
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    }),
    new NormalModuleReplacementPlugin(
      /node:crypto/,
      require.resolve('crypto-browserify')
    )
  );

  // Set up dev server configuration
  config.devServer = {
    hot: true,
    historyApiFallback: true,
    compress: true,
    host: '0.0.0.0',
    port: 19006,
    allowedHosts: 'all',
    client: {
      overlay: true,
      progress: true
    },
    static: {
      directory: path.join(__dirname, 'public'),
      publicPath: '/'
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };

  // Add HtmlWebpackPlugin to use our template
  if (!config.plugins) {
    config.plugins = [];
  }
  
  const HtmlWebpackPlugin = require('html-webpack-plugin');
  config.plugins.push(
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public/index.html'),
      filename: 'index.html',
      inject: true
    })
  );

  return config;
};
