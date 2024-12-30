import React from 'react';
import { Phone, Video } from 'lucide-react';

const VideoCallUI = ({ handleStartCall }) => {
  return (
    <div className="flex items-center space-x-2">
      <button onClick={() => handleStartCall('audio')} className="p-2 hover:bg-blue-700 rounded-full">
        <Phone size={20} />
      </button>
      <button onClick={() => handleStartCall('video')} className="p-2 hover:bg-blue-700 rounded-full">
        <Video size={20} />
      </button>
    </div>
  );
};

export default VideoCallUI;
