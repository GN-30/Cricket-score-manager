import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Environment, Float, MeshReflectorMaterial, Cylinder } from '@react-three/drei'
import * as THREE from 'three'

// The Cricket Pitch
function Pitch() {
  return (
    <group position={[0, 0, 0]}>
      {/* The main green grass field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#0A192F" roughness={0.8} />
      </mesh>
      
      {/* The central pitch (brown/beige) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 20]} />
        <MeshReflectorMaterial
          blur={[10, 10]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.8}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#15253A"
          metalness={0.5}
        />
      </mesh>

      {/* Crease Lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 8]}>
        <planeGeometry args={[4, 0.1]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -8]}>
        <planeGeometry args={[4, 0.1]} />
        <meshBasicMaterial color="white" />
      </mesh>
      
      {/* Abstract Wickets */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.4, 8.5]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.8]} />
            <meshStandardMaterial color="#FFB800" />
          </mesh>
          <mesh position={[x, 0.4, -8.5]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.8]} />
            <meshStandardMaterial color="#FFB800" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Glowing Stadium Stands
function StadiumStands() {
  return (
    <group>
      {/* Tier 1 */}
      <Cylinder args={[42, 40, 5, 64]} position={[0, 2.5, 0]} receiveShadow>
        <meshStandardMaterial color="#0B1120" side={THREE.DoubleSide} />
      </Cylinder>
      {/* Tier 1 glowing edge */}
      <Cylinder args={[41.8, 41.8, 0.2, 64]} position={[0, 5, 0]}>
        <meshBasicMaterial color="#00D4FF" />
      </Cylinder>

      {/* Tier 2 */}
      <Cylinder args={[55, 45, 10, 64]} position={[0, 10, 0]} receiveShadow>
        <meshStandardMaterial color="#0B1120" side={THREE.DoubleSide} />
      </Cylinder>
      {/* Tier 2 glowing edge */}
      <Cylinder args={[54.8, 54.8, 0.2, 64]} position={[0, 15, 0]}>
        <meshBasicMaterial color="#FFB800" />
      </Cylinder>
    </group>
  )
}

// Floodlights
function Floodlights() {
  const lightTarget = new THREE.Object3D()
  lightTarget.position.set(0, 0, 0)

  return (
    <group>
      <primitive object={lightTarget} />
      <ambientLight intensity={0.5} color="#0B1120" />
      
      {/* 4 corner powerful spotlights pointing at pitch */}
      <spotLight position={[30, 40, 30]} angle={0.4} penumbra={0.5} intensity={5} color="#ffffff" castShadow target={lightTarget} />
      <spotLight position={[-30, 40, 30]} angle={0.4} penumbra={0.5} intensity={5} color="#00D4FF" target={lightTarget} />
      <spotLight position={[30, 40, -30]} angle={0.4} penumbra={0.5} intensity={5} color="#39FF14" target={lightTarget} />
      <spotLight position={[-30, 40, -30]} angle={0.4} penumbra={0.5} intensity={5} color="#FFB800" target={lightTarget} />
    </group>
  )
}

// Dynamic Camera Controller linked to Scroll
const startPos = new THREE.Vector3(0, 40, 60)
const endPos = new THREE.Vector3(0, 5, 15)
const currentTargetPos = new THREE.Vector3()
const upAxis = new THREE.Vector3(0, 1, 0)
const lookAtTarget = new THREE.Vector3()

function ScrollCameraController() {
  const { camera } = useThree()

  useFrame(() => {
    // Calculate scroll progress (0 at top, 1 at bottom of the page)
    // We assume the body is scrollable.
    const scrollY = window.scrollY
    const maxScroll = document.body.scrollHeight - window.innerHeight
    const progress = Math.min(Math.max(scrollY / (maxScroll || 1), 0), 1)

    // Smoothly interpolate camera position based on scroll progress
    currentTargetPos.lerpVectors(startPos, endPos, progress)
    
    // Add a slight rotation based on scroll as well
    currentTargetPos.applyAxisAngle(upAxis, progress * Math.PI / 4)

    camera.position.lerp(currentTargetPos, 0.05)
    
    // Always look at the center of the pitch, but pan slightly down as we get closer
    lookAtTarget.set(0, progress * 2, 0)
    
    // In Three.js, to lerp rotation towards a lookAt, it's easier to manually interpolate the quaternion
    // But for a simple effect, we can just lookAt directly every frame
    camera.lookAt(lookAtTarget)
  })

  return null
}

export default function ThreeScene() {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
      <Canvas shadows camera={{ position: [0, 40, 60], fov: 45 }}>
        <ScrollCameraController />
        <Floodlights />
        <Pitch />
        <StadiumStands />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />
      </Canvas>
      
      {/* Fade overlay so content is readable on top of the 3D scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-deep-navy)]/60 to-[var(--color-deep-navy)] pointer-events-none" />
    </div>
  )
}
