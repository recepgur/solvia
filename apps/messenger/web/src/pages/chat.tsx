import React from 'react';
import dynamic from 'next/dynamic';

const ChatPageComponent = dynamic(() => import('../components/ChatPage'), {
  ssr: false,
});

const ChatPage: React.FC = () => {
  return <ChatPageComponent />;
};

export default ChatPage;
