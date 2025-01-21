import { Platform } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import IPFSManager from './ipfs';

class MediaManager {
  private ipfsManager: IPFSManager;

  constructor() {
    this.ipfsManager = new IPFSManager();
  }

  async pickImage(): Promise<{ uri: string; type: string; } | null> {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'mixed',
        quality: 1,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri!,
        type: asset.type || 'image/jpeg',
      };
    } catch (error) {
      console.error('Error picking media:', error);
      return null;
    }
  }

  async uploadMedia(uri: string): Promise<string | null> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          resolve(Buffer.from(arrayBuffer));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      return await this.ipfsManager.uploadFile(buffer);
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  }
}

export default MediaManager;
