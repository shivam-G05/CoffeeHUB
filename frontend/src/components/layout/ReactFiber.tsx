import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "./Scene";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

const ReactFiber = () => {
  return (
    <div className="h-full w-full">
      <Canvas flat camera={{ fov: 25, position: [0, 0, 5] }}>
        <OrbitControls enableZoom={false} />
        <ambientLight />
        <Scene />
        <EffectComposer>
          <Bloom
            mipmapBlur // Enables or disables mipmap blur.
            intensity={0.6} // The bloom intensity.
            luminanceThreshold={0.7} // luminance threshold. Raise this value to mask out darker elements in the scene.
            luminanceSmoothing={0.2} // smoothness of the luminance threshold. Range is [0, 1]
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default ReactFiber;
