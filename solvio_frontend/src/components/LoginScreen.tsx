import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletConnect } from "./WalletConnect";
import { MessageSquare, Shield, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";

// CSS for network animation
const networkAnimationStyles = `
.network-container {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.network-container.loaded {
  opacity: 1;
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
  width: 24px;
  height: 24px;
  background: hsl(var(--primary));
  border-radius: 50%;
  position: absolute;
  box-shadow: 
    0 0 20px hsl(var(--primary)),
    0 0 40px hsl(var(--primary) / 0.5);
  animation: 
    float 10s infinite cubic-bezier(0.4, 0, 0.2, 1),
    messageFloat 3s infinite ease-in-out;
  z-index: 20;
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
    <Card className="flex flex-col items-center p-6 text-center relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="mb-4 p-3 rounded-full bg-primary/10 transition-transform duration-300 group-hover:-translate-y-1">
        {icon}
      </div>
      <CardHeader className="p-0 mb-2 relative z-10">
        <CardTitle className="text-xl transition-colors duration-300">{title}</CardTitle>
      </CardHeader>
      <CardDescription className="relative z-10 transition-colors duration-300">{description}</CardDescription>
    </Card>
  );
}

export function LoginScreen() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Gradient background with enhanced visibility */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-background to-primary/5" />
      
      {/* Network animation container with improved z-index */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`relative w-full h-full network-container ${!isLoading ? 'loaded' : ''}`} id="network-particles">
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
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Welcome to Solvio</h1>
            <p className="text-base md:text-xl text-muted-foreground">
              The next generation of decentralized communication
            </p>
          </div>
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
            onConnect={(address, walletType) => {
              console.log(`Connected to ${walletType} with address ${address}`);
            }}
            onError={(error) => {
              console.error('Wallet connection error:', error);
            }}
            onDisconnect={() => {
              console.log('Wallet disconnected');
            }}
          />
        </div>
      </div>
    </div>
  );
}
