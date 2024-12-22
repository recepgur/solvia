import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Sphere,
  Float,
  Points,
  PointMaterial,
  MeshDistortMaterial
} from '@react-three/drei';
import * as THREE from 'three';

// Particle cloud for blockchain visualization
function ParticleCloud({ count = 1000 }) {
  const points = useRef<THREE.Points>(null!);
  
  useFrame((state) => {
    points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    points.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
  });

  return (
    <Points ref={points} limit={count}>
      <PointMaterial
        transparent
        vertexColors
        size={0.15}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

// Animated SOLV token
function SolvToken() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = React.useState(false);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = time * 0.5;
    meshRef.current.position.y = Math.sin(time) * 0.2;
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.5}
      floatIntensity={0.5}
    >
      <Sphere
        ref={meshRef}
        args={[1, 64, 64]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <MeshDistortMaterial
          color={hovered ? "#00ffff" : "#0088ff"}
          emissive={hovered ? "#00ffff" : "#0088ff"}
          emissiveIntensity={hovered ? 3 : 2}
          metalness={1}
          roughness={0}
          distort={0.4}
          speed={4}
        />
      </Sphere>
    </Float>
  );
}

// Message validation particles with stages
function ValidationParticles({ active = false }) {
  const particlesRef = useRef<THREE.Points>(null!);
  const [stage, setStage] = React.useState(0);
  
  // Different particle configurations for each stage
  const positions = React.useMemo(() => {
    const pos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  // Progress through validation stages
  React.useEffect(() => {
    if (active) {
      setStage(1);
      const timer1 = setTimeout(() => setStage(2), 800);
      const timer2 = setTimeout(() => setStage(3), 1400);
      const timer3 = setTimeout(() => setStage(0), 2000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setStage(0);
    }
  }, [active]);

  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < 300; i++) {
      const i3 = i * 3;
      
      // Different animation patterns for each stage
      switch (stage) {
        case 1: // Initial validation
          positions[i3] += Math.sin(time + i) * 0.01;
          positions[i3 + 1] += Math.cos(time + i) * 0.01;
          break;
        case 2: // Transaction simulation
          positions[i3] *= 0.99;
          positions[i3 + 1] *= 0.99;
          positions[i3 + 2] *= 0.99;
          break;
        case 3: // Confirmation
          {
            const angle = (i / 300) * Math.PI * 2;
            positions[i3] = Math.cos(angle + time) * (3 + Math.sin(time * 2));
            positions[i3 + 1] = Math.sin(angle + time) * (3 + Math.sin(time * 2));
            positions[i3 + 2] = Math.cos(time * 3) * 2;
          }
          break;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color={stage === 3 ? "#00ff88" : "#00ffff"}
        transparent
        opacity={active ? 1 : 0}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Scene setup and effects
function Scene({ isProcessing = false }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.z = 5;
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <ParticleCloud />
      <SolvToken />
      <ValidationParticles active={isProcessing} />
      
      {/* Enhanced particle effects and glow to compensate for no post-processing */}
      <pointLight position={[0, 0, 2]} intensity={2} color="#00ffff" />
      <pointLight position={[2, 0, 0]} intensity={1.5} color="#0088ff" />
      <pointLight position={[-2, 0, 0]} intensity={1.5} color="#ff00ff" />
    </>
  );
}

interface ThreeSceneProps {
  isProcessing?: boolean;
}

export function ThreeScene({ isProcessing = false }: ThreeSceneProps) {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <Scene isProcessing={isProcessing} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
