import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sphere, Box, Torus, Html } from '@react-three/drei';
import * as THREE from 'three';
import './styles.css';

// 3D Components
const BlockchainShowcase = () => {
  const meshRef = useRef(null);
  const particlesRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [activeBlock, setActiveBlock] = useState(null);
  
  useFrame((state) => {
    if (meshRef.current && isRotating) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.3;
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001;
      particlesRef.current.children.forEach((particle, i) => {
        particle.position.y = Math.sin(state.clock.elapsedTime + i) * 0.1;
      });
    }
  });

  const createParticles = () => {
    const particles = [];
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 4;
      
      // Create flowing particle trails
      const trailLength = 3;
      for (let j = 0; j < trailLength; j++) {
        particles.push(
          <mesh key={`${i}-${j}`} position={[
            r * Math.sin(theta) * Math.cos(phi + j * 0.1),
            r * Math.sin(theta) * Math.sin(phi + j * 0.1),
            r * Math.cos(theta)
          ]}>
            <sphereGeometry args={[0.02 - (j * 0.005), 8, 8]} />
            <meshStandardMaterial
              color={j === 0 ? "#00ff88" : "#4a90e2"}
              emissive={j === 0 ? "#00ff88" : "#4a90e2"}
              emissiveIntensity={2 - (j * 0.5)}
              transparent={true}
              opacity={1 - (j * 0.2)}
            />
          </mesh>
        );
      }
    }
    return particles;
  };

  const createCommunicationNetwork = () => {
    const nodes = [];
    const nodeCount = 8;
    const radius = 3;
    
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      nodes.push(
        <group key={i} position={[x, y, 0]}>
          <Sphere
            args={[0.4, 32, 32]}
            onPointerOver={() => setActiveBlock(i)}
            onPointerOut={() => setActiveBlock(null)}
          >
            <meshStandardMaterial
              color={activeBlock === i ? "#00ff88" : "#4a90e2"}
              metalness={0.9}
              roughness={0.1}
              emissive={activeBlock === i ? "#00ff88" : "#4a90e2"}
              emissiveIntensity={0.5}
            />
          </Sphere>
          
          {/* Create connections between nodes */}
          {Array.from({ length: 3 }, (_, j) => {
            const nextNode = (i + j + 1) % nodeCount;
            const nextAngle = (nextNode / nodeCount) * Math.PI * 2;
            const nextX = Math.cos(nextAngle) * radius;
            const nextY = Math.sin(nextAngle) * radius;
            
            return (
              <mesh key={`connection-${i}-${nextNode}`}>
                <cylinderGeometry
                  args={[0.03, 0.03, Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2), 8, 1]}
                  position={[(nextX + x) / 2, (nextY + y) / 2, 0]}
                  rotation={[0, 0, Math.atan2(nextY - y, nextX - x)]}
                />
                <meshStandardMaterial
                  color="#00ff88"
                  metalness={0.8}
                  roughness={0.2}
                  emissive="#00ff88"
                  emissiveIntensity={0.3}
                  transparent={true}
                  opacity={0.6}
                />
              </mesh>
            );
          })}
        </group>
      );
    }
    return nodes;
  };

  return (
    <>
      <group
        ref={meshRef}
        onClick={() => setIsRotating(!isRotating)}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <Sphere args={[2, 64, 64]} position={[0, 0, 0]}>
          <mesh>
            <sphereGeometry />
            <meshStandardMaterial
              color={isHovered ? "#00ff88" : "#4a90e2"}
              wireframe
              metalness={0.8}
              roughness={0.2}
              emissive={isHovered ? "#00ff88" : "#4a90e2"}
              emissiveIntensity={0.5}
            />
          </mesh>
        </Sphere>
        <group position={[0, 0, 0]}>
          {createCommunicationNetwork()}
        </group>
      </group>
      <group ref={particlesRef}>
        {createParticles()}
      </group>
      {(isHovered || activeBlock !== null) && (
        <Html position={[0, 4.5, 0]} center>
          <div style={{ 
            background: 'rgba(0,0,0,0.9)', 
            padding: '20px', 
            borderRadius: '10px',
            color: 'white',
            width: '300px',
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(0,255,136,0.3)'
          }}>
            <h2>Solvio Blockchain</h2>
            <p>{activeBlock !== null ? 
              `Node ${activeBlock + 1}: Free, Secure, Decentralized Communication` : 
              'Free Communication Network'}</p>
          </div>
        </Html>
      )}
    </>
  );
};

function App() {
  // Initialize Solana connection
  const [isConnected, setIsConnected] = useState(false);
  const [webGLEnabled, setWebGLEnabled] = useState(false);

  useEffect(() => {
    // Check for WebGL support
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    };
    setWebGLEnabled(checkWebGL());

    // Check if Phantom wallet is available
    const checkWallet = async () => {
      try {
        const { solana } = window;
        if (solana?.isPhantom) {
          await solana.connect({ onlyIfTrusted: true });
          setIsConnected(true);
        }
      } catch (error) {
        console.log('Wallet auto-connect error:', error);
      }
    };
    checkWallet();
  }, []);

  const handleConnect = async () => {
    try {
      const { solana } = window;
      if (solana?.isPhantom) {
        await solana.connect();
        setIsConnected(true);
      } else {
        window.open('https://phantom.app/', '_blank');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, color: 'white' }}>
        <button 
          onClick={handleConnect}
          className="control-button"
        >
          {isConnected ? 'Connected to Blockchain' : 'Connect Wallet'}
        </button>
      </div>
      
      {!webGLEnabled && (
        <div className="flash-warning">
          WebGL is required for optimal experience. Please update your browser for the best 3D experience.
        </div>
      )}

      <div className="project-info">
        <h1>Solvio</h1>
        <p>Revolutionary Blockchain Technology</p>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#4a90e2" />
        <spotLight position={[-10, -10, -10]} intensity={0.8} color="#00ff88" />
        <ambientLight intensity={0.2} />
        <Suspense fallback={null}>
          <BlockchainShowcase />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
