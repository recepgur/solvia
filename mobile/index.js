import './src/polyfills';
import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Initialize polyfills before rendering
console.log('Initializing application...');

// Register the app component first
AppRegistry.registerComponent(appName, () => App);

// Then handle web-specific mounting
if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root');
  if (!rootTag) {
    console.error('Root element not found');
  } else {
    console.log('Root element found, mounting application...');
    AppRegistry.runApplication(appName, { rootTag });
  }
}
