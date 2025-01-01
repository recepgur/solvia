import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletConnect } from "./WalletConnect";
import { MessageSquare, Shield, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";

// CSS for network animation
const networkAnimationStyles = `
.network-container {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.network-container.loaded {
  opacity: 1;
}

.network-node {
  filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.2));
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(15px, -15px) rotate(90deg); }
  50% { transform: translate(0, -30px) rotate(180deg); }
  75% { transform: translate(-15px, -15px) rotate(270deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.8); opacity: 0.1; }
  100% { transform: scale(1); opacity: 0.3; }
}

@keyframes connectLine {
  0% { transform: scaleX(0) translateY(0); opacity: 0; }
  50% { transform: scaleX(1) translateY(-10px); opacity: 0.3; }
  100% { transform: scaleX(0) translateY(0); opacity: 0; }
}

@keyframes nodeGradient {
  0% { background: hsl(var(--primary) / 0.2); }
  50% { background: hsl(var(--primary) / 0.4); }
  100% { background: hsl(var(--primary) / 0.2); }
}

.network-node {
  width: 12px;
  height: 12px;
  background: hsl(var(--primary) / 0.5);
  border-radius: 50%;
  position: absolute;
  box-shadow: 0 0 15px hsl(var(--primary) / 0.3);
  animation: 
    float 20s infinite cubic-bezier(0.4, 0, 0.2, 1),
    nodeGradient 4s infinite ease-in-out;
}

.network-node::after {
  content: '';
  position: absolute;
  inset: -6px;
  background: hsl(var(--primary) / 0.3);
  border-radius: 50%;
  animation: pulse 4s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

.network-line {
  height: 2px;
  background: linear-gradient(90deg, 
    hsl(var(--primary) / 0.2),
    hsl(var(--primary) / 0.5),
    hsl(var(--primary) / 0.2)
  );
  position: absolute;
  transform-origin: left;
  filter: drop-shadow(0 0 2px hsl(var(--primary) / 0.2));
  animation: connectLine 4s infinite ease-in-out;
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background/95 overflow-hidden relative">
      {/* Network animation container */}
      <style>{networkAnimationStyles}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-br from-background/50 via-background/30 to-background/50">
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
