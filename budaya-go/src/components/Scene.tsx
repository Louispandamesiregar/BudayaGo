'use client';

import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import * as THREE from 'three';
import Map from './Map';
import Hologram from './Hologram';

interface ActiveProvince {
  feature: any;
  position: THREE.Vector3;
}

export default function Scene() {
  const [activeProvince, setActiveProvince] = useState<ActiveProvince | null>(null);

  const handleProvinceClick = (feature: any, position: THREE.Vector3) => {
    console.log('Province clicked:', feature.properties.name, 'at position:', position);
    if (activeProvince && activeProvince.feature.id === feature.id) {
      setActiveProvince(null);
    } else {
      setActiveProvince({ feature, position });
    }
  };

  const handleHologramClose = () => {
    setActiveProvince(null);
  };

  return (
    <Canvas 
      style={{ width: '100vw', height: '100vh', background: '#111827' }} 
      camera={{ position: [0, 0, 15], fov: 50 }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight 
        position={[10, 20, 30]} 
        intensity={2.5} 
      />
      <pointLight position={[-10, -10, -10]} intensity={1.5} />

      <Suspense fallback={null}>
        <Bounds fit clip observe margin={0.6}>
          <Map 
            onProvinceClick={handleProvinceClick}
            activeProvince={activeProvince}
          />
        </Bounds>
      </Suspense>
      
      {activeProvince && (
        <Hologram 
          activeProvince={activeProvince} 
          onClose={handleHologramClose} 
        />
      )}

      <OrbitControls makeDefault enableZoom={true} enablePan={true} zoomSpeed={0.8} target={[0, 0, 0]} />
    </Canvas>
  );
}
