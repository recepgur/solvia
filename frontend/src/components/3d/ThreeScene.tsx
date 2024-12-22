import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  PerspectiveCamera,
  OrbitControls,
  Sphere,
  Trail,
  Float,
  Text3D,
  useTexture,
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

// Message validation particles
function ValidationParticles({ active = false }) {
  const particlesRef = useRef<THREE.Points>(null!);
  const positions = React.useMemo(() => {
    const pos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();
    for (let i = 0; i < 200; i++) {
      const i3 = i * 3;
      particlesRef.current.geometry.attributes.position.array[i3] += Math.sin(time + i) * 0.01;
      particlesRef.current.geometry.attributes.position.array[i3 + 1] += Math.cos(time + i) * 0.01;
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
        size={0.1}
        color="#00ffff"
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
