import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import WalletConnect from "./WalletConnect";
import { WalletType } from "@/types/wallet";
import { MessageSquare, Shield, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";

// CSS for network animation
const networkAnimationStyles = `
.network-container {
  opacity: 0;
  transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
}

.network-container.loaded {
  opacity: 1;
  animation: container-glow 3s infinite alternate;
}

@keyframes container-glow {
  from {
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
  }
  to {
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
  }

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(15px, -15px) scale(1.1); }
  50% { transform: translate(0, -30px) scale(1); }
  75% { transform: translate(-15px, -15px) scale(1.1); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.5); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.6; }
}

@keyframes connectLine {
  0% { transform: scaleX(0.3) translateY(0); opacity: 0.2; }
  50% { transform: scaleX(1) translateY(-5px); opacity: 0.8; }
  100% { transform: scaleX(0.3) translateY(0); opacity: 0.2; }
}

@keyframes messageFloat {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.1); }
  100% { transform: translateY(0) scale(1); }
}

.network-node {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #FF3366, #33FF99, #3366FF);
  border-radius: 50%;
  position: absolute;
  box-shadow: 
    0 0 40px #FF3366,
    0 0 60px #33FF99,
    0 0 80px #3366FF;
  animation: 
    float 10s infinite cubic-bezier(0.4, 0, 0.2, 1),
    messageFloat 2.5s infinite ease-in-out;
  z-index: 20;
  opacity: 1;
}

.network-node::before {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    hsl(var(--primary) / 0.4) 0%,
    transparent 70%
  );
  animation: pulse 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

.network-node::after {
  content: '';
  position: absolute;
  inset: 4px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.9;
}

.network-line {
  height: 3px;
  background: linear-gradient(90deg, 
    transparent,
    hsl(var(--primary)),
    transparent
  );
  position: absolute;
  transform-origin: left;
  box-shadow: 0 0 15px hsl(var(--primary));
  animation: connectLine 3s infinite ease-in-out;
  z-index: 15;
}`;

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="flex flex-col items-center p-6 text-center relative overflow-hidden group transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-purple-500/20 to-blue-500/30 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse-glow" />
      <div className="mb-4 p-3 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-gradient-to-tr group-hover:from-primary/30 group-hover:via-purple-500/20 group-hover:to-blue-500/30">
        {icon}
      </div>
      <CardHeader className="p-0 mb-2 relative z-10">
        <CardTitle className="text-xl transition-colors duration-300">{title}</CardTitle>
      </CardHeader>
      <CardDescription className="relative z-10 transition-colors duration-300">{description}</CardDescription>
    </Card>
  );
}

interface LoginScreenProps {
  children: React.ReactNode;
}

export function LoginScreen({ children }: LoginScreenProps) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Handle wallet connection errors
  const handleWalletError = (error: { type: string; message: string }) => {
    setError(error.message);
    // Auto-hide error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    
    // Add smooth entrance animation
    const timer = setTimeout(() => setIsLoading(false), 500);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      title: "Decentralized Messaging",
      description: "Send messages securely through blockchain technology"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "End-to-End Encryption",
      description: "Your conversations are private and secure"
    },
    {
      icon: <Wallet className="w-6 h-6 text-primary" />,
      title: "Multi-Wallet Support",
      description: "Connect with Phantom, MetaMask, Trust Wallet, or Coinbase"
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "Real-Time Communication",
      description: "Voice calls, video calls, and instant messaging"
    }
  ];

  useEffect(() => {
    // Inject network animation styles
    const styleTag = document.createElement('style');
    styleTag.innerHTML = networkAnimationStyles;
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
      {/* Enhanced gradient background with communication theme */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-radial from-[#FF1493]/95 via-[#00FF00]/80 to-[#1E90FF]/90 animate-pulse" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#FF1493/0.8,#00FF00/0.7,#1E90FF/0.8)] animate-spin-slow opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/70 via-[#00FF00]/60 to-[#1E90FF]/70 animate-gradient" />
        
        {/* Enhanced loading and error states with mobile optimization */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="animate-spin rounded-full h-24 w-24 sm:h-32 sm:w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Mobile-optimized error message display */}
        {error && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-center z-50">
            <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg max-w-md w-full">
              <p className="text-sm sm:text-base font-medium text-center">{error}</p>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,20,147,0.2),rgba(0,255,0,0.15),rgba(30,144,255,0.2))] animate-pulse-slow" />
      </div>
      
      {/* Network animation container with improved visibility */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className={`relative w-full h-full network-container ${!isLoading ? 'loaded scale-110' : ''}`} id="network-particles">
          {Array.from({ length: windowWidth < 768 ? 6 : 12 }).map((_, i) => (
            <div
              key={i}
              className="network-node"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                top: `${Math.random() * 80 + 10}%`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
          {Array.from({ length: windowWidth < 768 ? 6 : 12 }).map((_, i) => (
            <div
              key={i}
              className="network-line"
              style={{
                left: `${Math.random() * 60 + 20}%`,
                top: `${Math.random() * 60 + 20}%`,
                width: '100px',
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${i * 0.7}s`
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="max-w-5xl w-full space-y-8 md:space-y-12 relative z-10 px-4 md:px-6">
        <div className="text-center space-y-4">
          <div className="space-y-2 backdrop-blur-sm bg-background/80 p-4 md:p-6 rounded-lg">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#FF3366] via-[#33FF99] to-[#3366FF] bg-clip-text text-transparent animate-gradient mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Welcome to Solvio</h1>
            <p className="text-lg md:text-2xl bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">The next generation of decentralized communication</p>
          </div>
        </div>
        <div className="backdrop-blur-sm bg-background/80 p-4 md:p-6 rounded-lg">
          {children}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0 w-full">
          {features.map((feature, index) => (
            <div key={index} className="transform transition-all duration-300 hover:scale-105 w-full">
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </div>
          ))}
        </div>

        <div className="max-w-md mx-auto transform transition-all duration-300">
          <WalletConnect
            onConnect={(address: string, walletType: WalletType) => {
              console.log(`Connected to ${walletType} with address ${address}`);
            }}
            onError={handleWalletError}
            onDisconnect={() => {
              console.log('Wallet disconnected');
              setError(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
