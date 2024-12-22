import { useEffect } from 'react'
import { Coins, Sparkles, Globe, Users } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from 'framer-motion'

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  content: string;
  delay: string;
}

const ParticleEffect = () => {
  const particles = Array.from({ length: 20 })
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, index) => (
        <motion.div
          key={index}
          className="absolute w-2 h-2 bg-blue-400 rounded-full"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: 0
          }}
          animate={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  )
}

function App() {
  const features: FeatureCard[] = [
    {
      icon: <Coins className="text-yellow-400" size={32} />,
      title: "SOLV Token",
      description: "The native currency of the SOLVIO ecosystem",
      content: "Experience the power of decentralized finance with our native SOLV token.",
      delay: "delay-100"
    },
    {
      icon: <Globe className="text-blue-400" size={32} />,
      title: "Decentralized",
      description: "Built on Solana blockchain",
      content: "Leverage the speed and efficiency of the Solana blockchain ecosystem.",
      delay: "delay-200"
    },
    {
      icon: <Users className="text-purple-400" size={32} />,
      title: "Community",
      description: "Join our growing ecosystem",
      content: "Be part of a vibrant community shaping the future of decentralized communication.",
      delay: "delay-300"
    }
  ];

  useEffect(() => {
    // Initialize any required effects
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1,
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 overflow-hidden relative">
      <ParticleEffect />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="container mx-auto px-4 py-8"
      >
        {/* Hero Section */}
        <motion.div className="text-center mb-16" variants={itemVariants}>
          <motion.h1
            className="text-6xl font-bold text-white mb-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="inline-block"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="inline-block mr-2 text-yellow-400" />
              SOLV
            </motion.span>
          </motion.h1>
          <motion.p 
            className="text-2xl text-blue-200 mb-8"
            variants={itemVariants}
          >
            A decentralized token built on the Solana blockchain
          </motion.p>
          <motion.div 
            className="flex justify-center gap-4"
            variants={itemVariants}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Get Started
              </Button>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-blue-400 text-blue-400 hover:bg-blue-900"
              >
                Learn More
              </Button>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="bg-white/10 border-none text-white backdrop-blur-lg hover:bg-white/20 transition-all duration-300">
                <CardHeader>
                  {feature.icon}
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-blue-200">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feature.content}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="text-center mt-16 pb-8"
          variants={itemVariants}
        >
          <p className="text-blue-200">
            © 2024 SOLVIO. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default App
