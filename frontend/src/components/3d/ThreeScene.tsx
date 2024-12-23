import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Sphere,
  Float,
  Points,
  PointMaterial,
  MeshDistortMaterial
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, ColorDepth } from '@react-three/postprocessing';
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
          emissiveIntensity={hovered ? 5 : 3}
          metalness={1}
          roughness={0}
          distort={0.4}
          speed={4}
          toneMapped={false}
        />
      </Sphere>
    </Float>
  );
}

// Enhanced message validation particles with blockchain network visualization
interface ValidationParticlesProps {
  active: boolean;
  messageEffect?: MessageEffect;
}

function ValidationParticles({ active = false, messageEffect }: ValidationParticlesProps) {
  const defaultEffect = { active: false, position: [0, 0, 0] as [number, number, number] };
  const currentEffect = messageEffect || defaultEffect;
  const particlesRef = useRef<THREE.Points>(null!);
  const [stage, setStage] = React.useState(0);
  const [networkNodes, setNetworkNodes] = React.useState<THREE.Vector3[]>([]);
  const trailLength = 5; // Number of positions to keep for each particle
  const trailsHistory = useRef<Float32Array[]>(Array(trailLength).fill(null));
  
  // Generate network nodes in a more complex pattern
  React.useEffect(() => {
    const nodes: THREE.Vector3[] = [];
    const nodeCount = 12;
    
    // Create nodes in a double helix pattern
    for (let i = 0; i < nodeCount; i++) {
      const t = (i / nodeCount) * Math.PI * 4;
      const radius = 5;
      nodes.push(new THREE.Vector3(
        Math.cos(t) * radius,
        i - nodeCount/2,
        Math.sin(t) * radius
      ));
    }
    setNetworkNodes(nodes);
  }, []);

  // Different particle configurations for each stage with enhanced network effects
  const positions = React.useMemo(() => {
    const pos = new Float32Array(600 * 3); // Doubled particle count
    for (let i = 0; i < 600; i++) {
      if (i < networkNodes.length * 30) {
        // Particles around network nodes
        const nodeIndex = Math.floor(i / 30);
        const node = networkNodes[nodeIndex] || new THREE.Vector3();
        pos[i * 3] = node.x + (Math.random() - 0.5) * 2;
        pos[i * 3 + 1] = node.y + (Math.random() - 0.5) * 2;
        pos[i * 3 + 2] = node.z + (Math.random() - 0.5) * 2;
      } else {
        // Random particles for ambient effect
        pos[i * 3] = (Math.random() - 0.5) * 15;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      }
    }
    return pos;
  }, [networkNodes]);

  // Enhanced progress through validation stages with more dramatic animations
  React.useEffect(() => {
    if (active) {
      setStage(1);
      const timer1 = setTimeout(() => setStage(2), 600);
      const timer2 = setTimeout(() => setStage(3), 1200);
      const timer3 = setTimeout(() => setStage(4), 1800);
      const timer4 = setTimeout(() => setStage(5), 2400);
      const timer5 = setTimeout(() => setStage(0), 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    } else {
      setStage(0);
    }
  }, [active]);

  useFrame((state) => {
    if (!active && !currentEffect.active) return;
    const time = state.clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array;
    
    // Enhanced message launch effect with more dramatic animations
    if (currentEffect.active) {
      const [targetX, targetY, targetZ] = currentEffect.position;
      const launchTime = time * 8; // Increased animation speed
      
      for (let i = 0; i < 600; i++) {
        const i3 = i * 3;
        const angle = (Math.PI * 2 * i) / 100;
        const verticalOffset = Math.sin(launchTime + i * 0.2) * 1.5; // Increased amplitude
        const radius = 1.5 + Math.sin(launchTime * 3 + i * 0.1) * 0.8; // Larger radius
        
        // Create more dramatic spiral launch pattern with enhanced trails
        const spiralFactor = Math.sin(launchTime * 0.5) * 2; // Dynamic spiral size
        positions[i3] = targetX + Math.cos(angle + launchTime) * radius * spiralFactor;
        positions[i3 + 1] = targetY + verticalOffset + Math.sin(launchTime * 4) * 0.8;
        positions[i3 + 2] = targetZ + Math.sin(angle + launchTime) * radius * spiralFactor;
        
        // Add more explosive and dynamic motion
        const explosionScale = Math.min(launchTime * 0.2, 2.0); // Progressive explosion
        positions[i3] += Math.sin(launchTime * 1.5 + i) * explosionScale;
        positions[i3 + 1] += Math.cos(launchTime * 2 + i) * explosionScale;
        positions[i3 + 2] += Math.sin(launchTime * 2.5 + i) * explosionScale;
        
        // Add glowing trail effect
        if (i < 200) { // Trail particles
          const trailPhase = (i / 200) * Math.PI * 2;
          const trailRadius = radius * (1 - i / 200); // Diminishing radius
          positions[i3] += Math.cos(trailPhase + launchTime * 3) * trailRadius * 0.5;
          positions[i3 + 1] += Math.sin(trailPhase + launchTime * 2) * trailRadius * 0.3;
          positions[i3 + 2] += Math.cos(trailPhase + launchTime * 4) * trailRadius * 0.5;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      return;
    }
    
    // Enhanced trail history with dynamic opacity
    for (let t = trailsHistory.current.length - 1; t > 0; t--) {
      const opacity = 1 - (t / trailsHistory.current.length);
      trailsHistory.current[t].set(trailsHistory.current[t - 1]);
      // Add subtle movement to trails
      for (let i = 0; i < trailsHistory.current[t].length; i += 3) {
        trailsHistory.current[t][i] += Math.sin(time + i) * 0.01 * opacity;
        trailsHistory.current[t][i + 1] += Math.cos(time + i) * 0.01 * opacity;
        trailsHistory.current[t][i + 2] += Math.sin(time * 1.5 + i) * 0.01 * opacity;
      }
    }
    trailsHistory.current[0].set(positions);
    
    for (let i = 0; i < 600; i++) {
      const i3 = i * 3;
      
      // Enhanced animation patterns for each stage
      switch (stage) {
        case 1: // Network activation with swirling trails
          {
            const angle = time * 2 + i * 0.1;
            const radius = 3 + Math.sin(time + i * 0.1) * 0.5;
            positions[i3] += (Math.cos(angle) * radius * 0.1 - positions[i3]) * 0.1;
            positions[i3 + 1] += (Math.sin(time * 2 + i * 0.05) * 2 - positions[i3 + 1]) * 0.1;
            positions[i3 + 2] += (Math.sin(angle) * radius * 0.1 - positions[i3 + 2]) * 0.1;
          }
          break;
          
        case 2: // Enhanced data propagation with spiral motion
          {
            const angle = (i / 600) * Math.PI * 4 + time * 2;
            const verticalOffset = Math.sin(time * 3 + i * 0.1) * 2;
            const radius = 4 + Math.sin(time * 2 + i * 0.1) * 1;
            positions[i3] = Math.cos(angle) * radius * (1 + Math.sin(time + i * 0.1) * 0.2);
            positions[i3 + 1] = verticalOffset + Math.sin(time * 3) * 2;
            positions[i3 + 2] = Math.sin(angle) * radius * (1 + Math.cos(time + i * 0.1) * 0.2);
          }
          break;
          
        case 3: // Dynamic block formation with orbital motion
          {
            const nodeIndex = Math.floor(i / 50) % networkNodes.length;
            const targetNode = networkNodes[nodeIndex];
            const orbitAngle = time * 2 + i * 0.1;
            const orbitRadius = 0.5 + Math.sin(time + i * 0.05) * 0.3;
            
            positions[i3] += (targetNode.x + Math.cos(orbitAngle) * orbitRadius - positions[i3]) * 0.15;
            positions[i3 + 1] += (targetNode.y + Math.sin(orbitAngle * 2) * orbitRadius - positions[i3 + 1]) * 0.15;
            positions[i3 + 2] += (targetNode.z + Math.sin(orbitAngle) * orbitRadius - positions[i3 + 2]) * 0.15;
          }
          break;
          
        case 4: // Enhanced consensus wave with dramatic motion
          {
            const wave = Math.sin(time * 4 + positions[i3] * 0.5) * 
                        Math.cos(time * 3 + positions[i3 + 2] * 0.5) * 2;
            const spiral = Math.sin(time * 2 + i * 0.1) * 3;
            positions[i3] += (Math.cos(time * 3 + i * 0.1) * spiral + wave) * 0.15;
            positions[i3 + 1] += Math.sin(time * 5 + i * 0.1) * 0.3;
            positions[i3 + 2] += (Math.sin(time * 3 + i * 0.1) * spiral + wave) * 0.15;
          }
          break;
          
        case 5: // Dramatic network celebration with burst effects
          {
            const burstTime = time * 3;
            const burstRadius = 5 + Math.sin(burstTime + i * 0.1) * 3;
            const burstAngle = burstTime + i * 0.2;
            const verticalBurst = Math.sin(burstTime * 2 + i * 0.3) * 4;
            
            positions[i3] = Math.cos(burstAngle) * burstRadius * (1 + Math.sin(burstTime + i * 0.05) * 0.5);
            positions[i3 + 1] = verticalBurst + Math.sin(burstTime * 2) * 3;
            positions[i3 + 2] = Math.sin(burstAngle) * burstRadius * (1 + Math.cos(burstTime + i * 0.05) * 0.5);
            
            // Add explosive motion
            positions[i3] += Math.sin(burstTime + i) * 0.4;
            positions[i3 + 1] += Math.cos(burstTime + i) * 0.4;
            positions[i3 + 2] += Math.sin(burstTime * 1.5 + i) * 0.4;
          }
          break;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group>
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
          size={0.2}
          color={stage === 3 ? "#00ff88" : "#00ffff"}
          transparent
          opacity={active ? 1 : 0}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      
      {/* Particle trails */}
      {trailsHistory.current.map((trailPositions, index) => (
        <points key={index}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trailPositions.length / 3}
              array={trailPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.15 - index * 0.02}
            color={stage === 3 ? "#00ff88" : "#00ffff"}
            transparent
            opacity={active ? (1 - index / trailLength) * 0.3 : 0}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      ))}
    </group>
  );
}

// Optimized blockchain network connections using InstancedMesh
function NetworkConnections({ nodes }: { nodes: THREE.Vector3[] }) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const connectionsRef = useRef<{ start: THREE.Vector3; end: THREE.Vector3; strength: number }[]>([]);
  
  // Create shared geometry and material for better performance
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.01, 0.01, 1, 8, 1), []);
  const material = useMemo(() => new THREE.MeshPhongMaterial({
    color: "#00ffaa",
    transparent: true,
    opacity: 0.3,
    emissive: "#00ffaa",
    emissiveIntensity: 0.5,
    toneMapped: false
  }), []);
  
  // Calculate and update connections
  useEffect(() => {
    if (!instancedMeshRef.current) return;
    
    const connections: typeof connectionsRef.current = [];
    const dummy = new THREE.Object3D();
    let instanceCount = 0;
    
    // Calculate valid connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const start = nodes[i];
        const end = nodes[j];
        const distance = start.distanceTo(end);
        const shouldConnect = distance < 4 || Math.random() < 0.3;
        
        if (shouldConnect) {
          const strength = Math.max(0.2, 1 - distance / 8);
          connections.push({ start, end, strength });
          instanceCount++;
        }
      }
    }
    
    // Update instances
    instancedMeshRef.current.count = instanceCount;
    connections.forEach((conn, index) => {
      const direction = conn.end.clone().sub(conn.start);
      const center = conn.start.clone().add(direction.clone().multiplyScalar(0.5));
      const length = direction.length();
      
      dummy.position.copy(center);
      dummy.scale.set(1, length, 1);
      dummy.lookAt(conn.end);
      dummy.updateMatrix();
      
      instancedMeshRef.current.setMatrixAt(index, dummy.matrix);
    });
    
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    connectionsRef.current = connections;
  }, [nodes]);
  
  // Animate the entire network
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, Math.pow(nodes.length, 2)]}
        frustumCulled={false}
      />
    </group>
  );
}

// Optimized blockchain node visualization using InstancedMesh
function BlockchainNode({ position, index }: { position: THREE.Vector3; index: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.MeshPhongMaterial>(null!);
  const originalPosition = useRef(position.clone());
  
  // Create shared geometry and material for better performance
  const geometry = useMemo(() => new THREE.SphereGeometry(0.2, 32, 32), []);
  const material = useMemo(() => new THREE.MeshPhongMaterial({
    color: "#00ffaa",
    emissive: "#00ffaa",
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
    toneMapped: false
  }), []);
  
  useFrame((state) => {
    if (!groupRef.current || !materialRef.current) return;
    const time = state.clock.elapsedTime;
    
    // GPU-friendly scale animation using matrix transformation
    const scale = 1 + Math.sin(time * 2 + index) * 0.15;
    const matrix = new THREE.Matrix4();
    
    // Optimized orbital movement
    const orbitRadius = 0.2;
    const orbitSpeed = 0.5;
    const orbitOffset = new THREE.Vector3(
      Math.cos(time * orbitSpeed + index) * orbitRadius,
      Math.sin(time * orbitSpeed + index * 2) * orbitRadius,
      Math.cos(time * orbitSpeed + index * 3) * orbitRadius
    );
    
    const position = originalPosition.current.clone().add(orbitOffset);
    matrix.compose(
      position,
      new THREE.Quaternion(),
      new THREE.Vector3(scale, scale, scale)
    );
    
    groupRef.current.matrix.copy(matrix);
    groupRef.current.matrixAutoUpdate = false;
    
    // Optimized material updates using shared material
    materialRef.current.emissiveIntensity = 0.5 + Math.sin(time * 3 + index) * 0.3;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <primitive object={material} ref={materialRef} />
      </mesh>
      {/* Add glow effect for Flash-style visualization */}
      <mesh geometry={geometry} scale={1.2}>
        <meshBasicMaterial
          color="#00ffaa"
          transparent
          opacity={0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Enhanced scene setup with blockchain network visualization
function Scene({ isProcessing = false, messageEffect }: SceneProps) {
  const { camera } = useThree();
  const [nodes, setNodes] = React.useState<THREE.Vector3[]>(() => []);
  const isInitialized = useRef(false);
  const cameraTargetRef = useRef({ x: 0, y: 2, z: 8 });
  const processingStartTime = useRef<number | null>(null);

  // Camera animation on processing state change
  useEffect(() => {
    // Initialize camera position only once
    if (!isInitialized.current) {
      camera.position.z = 8;
      camera.position.y = 2;
      isInitialized.current = true;
    }

    if (messageEffect?.active) {
      const [targetX, targetY, targetZ] = messageEffect.position;
      // Dramatic camera movement during message launch
      cameraTargetRef.current = {
        x: targetX * 2.5,
        y: 6 + Math.abs(targetY) * 2,
        z: 4 + Math.abs(targetZ) * 1.5
      };
      
      // Reset camera position after animation
      const resetTimer = setTimeout(() => {
        cameraTargetRef.current = { x: 0, y: 2, z: 8 };
      }, 2000);
      
      return () => clearTimeout(resetTimer);
    } else if (isProcessing) {
      processingStartTime.current = Date.now() / 1000;
      // Move camera to dramatic angle during processing
      cameraTargetRef.current = {
        x: Math.random() * 6 - 3,
        y: 5 + Math.random() * 3,
        z: 5 + Math.random() * 5
      };
    } else {
      processingStartTime.current = null;
      // Return to default position with slight randomization
      cameraTargetRef.current = {
        x: (Math.random() - 0.5) * 0.5,
        y: 2 + Math.random() * 0.5,
        z: 8 + Math.random() * 0.5
      };
    }
  }, [isProcessing, messageEffect]);

  // Smooth camera animation
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Gentle floating movement when idle
    const idleX = Math.sin(time * 0.2) * 0.5;
    const idleY = Math.cos(time * 0.15) * 0.3 + 2;
    const idleZ = Math.cos(time * 0.1) * 0.5 + 8;

    // Processing animation
    if (processingStartTime.current !== null) {
      const elapsed = time - processingStartTime.current;
      const progress = Math.min(1, elapsed * 2); // 0.5 second transition
      
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        cameraTargetRef.current.x,
        progress * 0.1
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        cameraTargetRef.current.y,
        progress * 0.1
      );
      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        cameraTargetRef.current.z,
        progress * 0.1
      );
    } else {
      // Smooth transition to idle animation
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, idleX, 0.02);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, idleY, 0.02);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, idleZ, 0.02);
    }

    // Look at center with slight offset based on time
    camera.lookAt(
      Math.sin(time * 0.1) * 0.5,
      Math.cos(time * 0.1) * 0.5,
      0
    );
    
    // Generate blockchain network nodes in a complex 3D pattern with double helix and random variations
    const newNodes: THREE.Vector3[] = [];
    const nodeCount = 25; // Increased node count for more complex visualization
    const radius = 4;
    const height = 4;
    const turns = 3;
    
    // Create double helix pattern with random variations
    for (let i = 0; i < nodeCount; i++) {
      const progress = i / (nodeCount - 1);
      const angle = progress * Math.PI * 2 * turns;
      
      // Add randomization to positions
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      );
      
      // First helix
      const pos1 = new THREE.Vector3(
        radius * Math.cos(angle),
        height * (progress - 0.5) * 2,
        radius * Math.sin(angle)
      ).add(randomOffset);
      
      // Second helix (offset by PI)
      const pos2 = new THREE.Vector3(
        radius * Math.cos(angle + Math.PI),
        height * (progress - 0.5) * 2,
        radius * Math.sin(angle + Math.PI)
      ).add(randomOffset);
      
      // Add both positions if we haven't reached nodeCount
      newNodes.push(pos1);
      if (newNodes.length < nodeCount) {
        newNodes.push(pos2);
      }
    }
    
    // Add some central nodes for more interesting connections
    const centerCount = 5;
    for (let i = 0; i < centerCount && newNodes.length < nodeCount; i++) {
      const angle = (i / centerCount) * Math.PI * 2;
      newNodes.push(new THREE.Vector3(
        radius * 0.3 * Math.cos(angle),
        (Math.random() - 0.5) * 2,
        radius * 0.3 * Math.sin(angle)
      ));
    }
    
    setNodes(newNodes);
  });

  return (
    <>
      <fog attach="fog" args={['#000' as THREE.ColorRepresentation, 5, 25]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -10]} intensity={1} />
      
      <ParticleCloud />
      <SolvToken />
      <ValidationParticles active={isProcessing} messageEffect={messageEffect} />
      
      {/* Enhanced blockchain network visualization with dramatic effects */}
      {nodes.map((pos, i) => (
        <BlockchainNode key={i} position={pos} index={i} />
      ))}
      <NetworkConnections nodes={nodes} />
      
      {/* Enhanced lighting for dramatic Flash-style effect */}
      <pointLight position={[0, 0, 2]} intensity={4} color="#00ffff" />
      <pointLight position={[2, 0, 0]} intensity={3} color="#0088ff" />
      <pointLight position={[-2, 0, 0]} intensity={3} color="#ff00ff" />
      <pointLight position={[0, 2, 0]} intensity={3} color="#00ff88" />
      <pointLight position={[0, -2, 0]} intensity={2} color="#ff00aa" />
    </>
  );
}

interface MessageEffect {
  active: boolean;
  position: [number, number, number];
}

interface ThreeSceneProps {
  isProcessing?: boolean;
  messageEffect?: MessageEffect;
}

// Ensure consistent typing between Scene and ThreeScene
type SceneProps = {
  isProcessing: boolean;
  messageEffect?: MessageEffect;
}

export function ThreeScene({ isProcessing = false, messageEffect }: ThreeSceneProps) {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <Scene isProcessing={isProcessing} messageEffect={messageEffect} />
        <EffectComposer>
          <Bloom 
            intensity={messageEffect?.active ? 3.0 : 2.0}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
          />
          <ChromaticAberration
            offset={
              messageEffect?.active
                ? new THREE.Vector2(0.01, 0.01)
                : isProcessing
                ? new THREE.Vector2(0.006, 0.006)
                : new THREE.Vector2(0, 0)
            }
            radialModulation={true}
            modulationOffset={0.5}
          />
          <ColorDepth bits={16} />
        </EffectComposer>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.25}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          autoRotate={!isProcessing}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
