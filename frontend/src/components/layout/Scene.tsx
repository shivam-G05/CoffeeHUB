import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import pouring from "./3.jpg";
import beans from "./beans.jpg";
import coffeePacket from "./coffe packet.jpg";
import machine from "./machine.jpg";

const IMAGES = [pouring, beans, coffeePacket, machine];

const SEGMENT_ANGLE = (Math.PI * 2) / IMAGES.length;
const GAP_RATIO = 0.85; // fraction of each segment's arc that is actually drawn
const ARC_LENGTH = SEGMENT_ANGLE * GAP_RATIO;
const ARC_OFFSET = (SEGMENT_ANGLE - ARC_LENGTH) / 2;

const RADIUS = 1;
const CYLINDER_HEIGHT = 1.2;
const SEGMENT_ASPECT = (RADIUS * ARC_LENGTH) / CYLINDER_HEIGHT;

const Scene = () => {
  const textures = useTexture(IMAGES);
  const drum = useRef<THREE.Group>(null!);

  useFrame((_state, delta) => {
    if (drum.current) {
      drum.current.rotation.y += delta;
    }
  });

  textures.forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;

    const img = tex.image as HTMLImageElement;
    const imageAspect = img.width / img.height;

    // Crop like CSS `object-fit: cover` so each photo fills its segment
    // without being stretched to match the segment's own aspect ratio.
    let repeatX = 1;
    let repeatY = 1;
    if (imageAspect > SEGMENT_ASPECT) {
      repeatX = SEGMENT_ASPECT / imageAspect;
    } else {
      repeatY = imageAspect / SEGMENT_ASPECT;
    }
    tex.repeat.set(repeatX, repeatY);
    tex.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);
  });

  return (
    <group rotation={[0, 1.4, 0.5]}>
      <group ref={drum}>
        {textures.map((tex, i) => (
          <mesh key={i}>
            <cylinderGeometry
              args={[RADIUS, RADIUS, CYLINDER_HEIGHT, 40, 1, true, i * SEGMENT_ANGLE + ARC_OFFSET, ARC_LENGTH]}
            />
            <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export default Scene;
