import * as React from 'react';
import { X, Download, Forward, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MediaPreviewProps {
  hash: string;
  type: string;
  onClose: () => void;
  onForward?: () => void;
  onDownload?: () => void;
  onStar?: () => void;
  fullSize?: boolean;
}

export function MediaPreview({ hash, type, onClose, onForward, onDownload, onStar, fullSize = false }: MediaPreviewProps) {
  const ipfsUrl = `https://ipfs.io/ipfs/${hash}`;
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleDoubleClick = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`${fullSize ? 'fixed inset-0 z-50 bg-black' : ''} ${isFullscreen ? '' : 'p-4 md:p-8'}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onClose}
          className="touch-target text-white hover:bg-white/10 rounded-full p-2"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex items-center space-x-4">
          {onForward && (
            <button
              onClick={onForward}
              className="touch-target text-white hover:bg-white/10 rounded-full p-2"
              aria-label={t('forward')}
            >
              <Forward className="h-6 w-6" />
            </button>
          )}
          {onStar && (
            <button
              onClick={onStar}
              className="touch-target text-white hover:bg-white/10 rounded-full p-2"
              aria-label={t('star')}
            >
              <Star className="h-6 w-6" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="touch-target text-white hover:bg-white/10 rounded-full p-2"
              aria-label={t('download')}
            >
              <Download className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Media Content */}
      <div 
        className="h-full flex items-center justify-center"
        onDoubleClick={handleDoubleClick}
      >
        {type.startsWith('image/') ? (
          <img
            src={ipfsUrl}
            alt=""
            className={`max-h-full max-w-full object-contain ${
              isFullscreen ? 'w-full h-full object-cover' : ''
            }`}
          />
        ) : type.startsWith('video/') ? (
          <video
            src={ipfsUrl}
            controls
            className={`max-h-full max-w-full ${
              isFullscreen ? 'w-full h-full object-cover' : ''
            }`}
          />
        ) : type.startsWith('audio/') ? (
          <div className="w-full max-w-lg p-4">
            <audio src={ipfsUrl} controls className="w-full" />
          </div>
        ) : (
          <div className="text-white text-center p-4">
            <a href={ipfsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {t('media.download')}
            </a>
          </div>
        )}
      </div>

      {/* Swipe indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
        <div className="w-2 h-2 rounded-full bg-white/50" />
        <div className="w-2 h-2 rounded-full bg-white" />
        <div className="w-2 h-2 rounded-full bg-white/50" />
      </div>
    </div>
  );
}
