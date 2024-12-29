import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = true
}) => {
  return (
    <div className={`loading-screen ${fullScreen ? 'full-screen' : ''}`}>
      <LoadingSpinner size="lg" />
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingScreen;
