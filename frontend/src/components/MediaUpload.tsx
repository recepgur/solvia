import { useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Paperclip, X } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';

interface MediaUploadProps {
  onUpload: (hash: string, type: string) => void;
}

export function MediaUpload({ onUpload }: MediaUploadProps) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia, isUploading } = useMedia();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
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
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(t('error.upload.failed'));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setPreview(null);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="" className="h-20 w-20 rounded object-cover" />
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
