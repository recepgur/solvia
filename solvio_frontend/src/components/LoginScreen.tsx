import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletConnect } from "./WalletConnect";
import { MessageSquare, Shield, Wallet, Zap } from "lucide-react";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background overflow-hidden relative">
      {/* Network particle animation container - will be animated with framer-motion */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full" id="network-particles">
          {/* Particle nodes will be rendered here */}
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
