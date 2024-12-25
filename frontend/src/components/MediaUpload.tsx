import { useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Paperclip, X } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useWallet } from '@solana/wallet-adapter-react';

interface MediaUploadProps {
  onUpload: (hash: string, type: string) => void;
}

export function MediaUpload({ onUpload }: MediaUploadProps) {
  const { t } = useLanguage();
  const [options, setOptions] = useState<{
    preview: string | null;
    error: string | null;
  }>({
    preview: null,
    error: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia, isUploading } = useMedia();
  const { connected } = useWallet();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states at the start
    setOptions(prev => ({
      ...prev,
      error: null,
      preview: null
    }));

    try {
      // Check wallet connection
      if (!connected) {
        throw new Error('Please connect your wallet');
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const result = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
        setOptions(prev => ({
          ...prev,
          preview: result
        }));
      }

      // Upload using useMedia hook
      const result = await uploadMedia(file);
      if (result) {
        onUpload(result.hash, result.type);
      }

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: Error | unknown) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
      const errorMessage = errorObj.message === 'error.token.required' 
        ? 'Solvio token is required to upload media'
        : errorObj.message || t('error.upload.failed');
      
      setOptions(prev => ({
        ...prev,
        error: errorMessage
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearPreview = () => {
    setOptions(prev => ({
      ...prev,
      preview: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      {options.error && (
        <div className="text-red-500 text-sm mb-2" role="alert" data-testid="error-message">
          {options.error}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Attach File"
      />
      
      {options.preview ? (
        <div className="relative inline-block">
          <img src={options.preview} alt="" className="h-20 w-20 rounded object-cover" />
          <button
            onClick={clearPreview}
            className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1 text-white hover:bg-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="ghost"
          size="icon"
          disabled={isUploading}
          title={t('button.attach')}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
