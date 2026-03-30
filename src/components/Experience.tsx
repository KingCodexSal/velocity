import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float } from "@react-three/drei";
import * as THREE from "three";

function LiquidMesh({ color }: { color: string }) {
  const mesh = useRef<any>(null);

  useFrame((state) => {
    const { mouse } = state;
    if (mesh.current) {
      // Direct mouse tracking logic
      mesh.current.rotation.x = THREE.MathUtils.lerp(
        mesh.current.rotation.x,
        mouse.y * 1.5,
        0.1,
      );
      mesh.current.rotation.y = THREE.MathUtils.lerp(
        mesh.current.rotation.y,
        mouse.x * 1.5,
        0.1,
      );
    }
  });

  return (
    <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh} scale={2.2}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          speed={3}
          distort={0.4}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

export const Experience = ({ dark }: { dark: boolean }) => (
  <div className="fixed inset-0 -z-10 transition-colors duration-700">
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={dark ? 0.2 : 0.8} />
      <pointLight
        position={[10, 10, 10]}
        intensity={dark ? 50 : 20}
        color="#f43f5e"
      />
      <LiquidMesh color={dark ? "#08080a" : "#f1f5f9"} />
    </Canvas>
  </div>
);
