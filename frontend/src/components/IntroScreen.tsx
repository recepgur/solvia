import React, { useEffect, useState } from 'react';

const BlockchainNode: React.FC<{ delay: number; top: string; left: string }> = ({ delay, top, left }) => (
  <div 
    className="blockchain-node" 
    style={{ 
      top, 
      left, 
      animationDelay: `${delay}s`,
    }}
  />
);

const BlockchainConnection: React.FC<{ start: { x: number; y: number }; end: { x: number; y: number }; delay: number }> = 
  ({ start, end, delay }) => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
    const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    return (
      <div 
        className="blockchain-connection"
        style={{
          top: `${start.y}px`,
          left: `${start.x}px`,
          width: `${length}px`,
          transform: `rotate(${angle}deg)`,
          animationDelay: `${delay}s`,
        }}
      />
    );
};

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  console.log('IntroScreen component mounting');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    console.log('IntroScreen mounted');
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClick = () => {
      onComplete();
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onComplete]);

  const [dimensions, setDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1024, 
    height: typeof window !== 'undefined' ? window.innerHeight : 768 
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Update dimensions on mount and window resize
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="intro-screen" role="presentation">
      <div className="blockchain-animation">
        {/* Blockchain nodes */}
        {dimensions.width && dimensions.height && (
          <>
            <BlockchainNode delay={0} top={`${dimensions.height * 0.2}px`} left={`${dimensions.width * 0.2}px`} />
            <BlockchainNode delay={0.2} top={`${dimensions.height * 0.3}px`} left={`${dimensions.width * 0.6}px`} />
            <BlockchainNode delay={0.4} top={`${dimensions.height * 0.6}px`} left={`${dimensions.width * 0.3}px`} />
            <BlockchainNode delay={0.6} top={`${dimensions.height * 0.7}px`} left={`${dimensions.width * 0.7}px`} />
            <BlockchainNode delay={0.8} top={`${dimensions.height * 0.4}px`} left={`${dimensions.width * 0.4}px`} />
          </>
        )}
        
        {mounted && dimensions.width && dimensions.height && (
          <>
            <BlockchainConnection 
              start={{ x: dimensions.width * 0.2, y: dimensions.height * 0.2 }} 
              end={{ x: dimensions.width * 0.6, y: dimensions.height * 0.15 }} 
              delay={0.1} 
            />
            <BlockchainConnection 
              start={{ x: dimensions.width * 0.6, y: dimensions.height * 0.15 }} 
              end={{ x: dimensions.width * 0.3, y: dimensions.height * 0.3 }} 
              delay={0.3} 
            />
            <BlockchainConnection 
              start={{ x: dimensions.width * 0.3, y: dimensions.height * 0.3 }} 
              end={{ x: dimensions.width * 0.7, y: dimensions.height * 0.35 }} 
              delay={0.5} 
            />
            <BlockchainConnection 
              start={{ x: dimensions.width * 0.4, y: dimensions.height * 0.2 }} 
              end={{ x: dimensions.width * 0.3, y: dimensions.height * 0.3 }} 
              delay={0.7} 
            />
          </>
        )}
      </div>

      <div className={`intro-content ${mounted ? 'fade-in' : ''}`}>
        <h1 className="intro-title">Solvio</h1>
        <p className="intro-subtitle">Decentralized Messaging on Solana</p>
        <div className="intro-features">
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span className="feature-text">End-to-End Encrypted</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⛓️</span>
            <span className="feature-text">Fully Decentralized</span>
          </div>
          <div className="feature">
            <span className="feature-icon">💬</span>
            <span className="feature-text">Secure Messaging</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
