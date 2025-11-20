import * as THREE from 'three';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Bounds } from '@react-three/drei';
import geojsonData from '@/data/indonesia.json';

interface ActiveProvince {
  feature: any;
  position: THREE.Vector3;
}

// FUNGSI UNTUK MENGUBAH NAMA GEOJSON MENJADI KEY JSON YANG VALID
const getProvinceKey = (name: string): string => {
  // Menghapus spasi dan karakter non-alfanumerik
  return name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
};

// Province component
function Province({ feature, onProvinceClick, active }: { feature: any; onProvinceClick: (feature: any, center: THREE.Vector3) => void; active: boolean; }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => {
    const { type, coordinates } = feature.geometry;
    const shapes: THREE.Shape[] = [];

    const createShape = (polygonCoords: number[][]) => {
      const shape = new THREE.Shape();
      if (polygonCoords && polygonCoords.length > 0) {
        const [x, y] = polygonCoords[0];
        shape.moveTo(x, y);
        for (let i = 1; i < polygonCoords.length; i++) {
          const [x, y] = polygonCoords[i];
          shape.lineTo(x, y);
        }
      }
      return shape;
    };

    const createShapeFromPolygon = (polygonCoords: number[][][]) => {
      const exteriorRing = polygonCoords[0];
      if (!exteriorRing) return null;

      const shape = createShape(exteriorRing);

      for (let i = 1; i < polygonCoords.length; i++) {
        const holeRing = polygonCoords[i];
        const holePath = new THREE.Path();
        if (holeRing && holeRing.length > 0) {
          const [x, y] = holeRing[0];
          holePath.moveTo(x, y);
          for (let j = 1; j < holeRing.length; j++) {
            const [x, y] = holeRing[j];
            holePath.lineTo(x, y);
          }
          shape.holes.push(holePath);
        }
      }
      return shape;
    };

    if (type === 'Polygon') {
      const shape = createShapeFromPolygon(coordinates);
      if (shape) shapes.push(shape);
    } else if (type === 'MultiPolygon') {
      coordinates?.forEach((polygon: number[][][]) => {
        const shape = createShapeFromPolygon(polygon);
        if (shape) shapes.push(shape);
      });
    }

    if (shapes.length === 0) return null;

    const extrudeSettings = {
      steps: 1,
      depth: active ? 0.04 : 0.02,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 1,
    };

    return new THREE.ExtrudeGeometry(shapes, extrudeSettings);
  }, [feature.geometry, active]);

  if (!geometry) return null;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (meshRef.current) {
      meshRef.current.geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      meshRef.current.geometry.boundingBox!.getCenter(center);
      meshRef.current.localToWorld(center); // Convert to world coordinates
      center.z += 0.5; // Adjust this value to position the hologram higher or lower
      onProvinceClick(feature, center); // Mengirim objek feature utuh
    }
  };

  const color = active ? '#06b6d4' : hovered ? '#67e8f9' : '#4b5563';

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
      onClick={handleClick}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 0.7 : hovered ? 0.5 : 0.2}
        roughness={0.8}
        metalness={0.4}
        transparent
        opacity={active ? 1.0 : 0.8}
      />
    </mesh>
  );
}

// Main Map component
export default function Map({ onProvinceClick, activeProvince }: { onProvinceClick: (feature: any, position: THREE.Vector3) => void; activeProvince: ActiveProvince | null; }) {
  const groupRef = useRef<THREE.Group>(null!);

  const handleProvinceClick = (feature: any, position: THREE.Vector3) => {
    onProvinceClick(feature, position);
  };

  const provinces = useMemo(() => {
    const features = geojsonData.features.filter(
      (feature) => feature.geometry && feature.properties.name
    );
    
    // Mendapatkan KEY provinsi aktif untuk perbandingan
    const activeKey = activeProvince?.feature?.properties?.name 
      ? getProvinceKey(activeProvince.feature.properties.name) 
      : null;
    
    return features.map((feature, index) => {
      // Menggunakan optional chaining untuk mencegah error jika properti hilang
      const provinceName = feature.properties?.name || '';
      const currentProvinceKey = getProvinceKey(provinceName);
      
      return (
        <Province
          key={feature.id || index}
          feature={feature}
          onProvinceClick={handleProvinceClick}
          // Membandingkan KEY yang sudah diformat
          active={currentProvinceKey === activeKey}
        />
      );
    });
  }, [activeProvince]);

  // ... (useEffect untuk scaling/centering tetap di sini)

  return (
    <group
      ref={groupRef}
      rotation={[-Math.PI / 2, 0, Math.PI]}
    >
      {provinces}
    </group>
  );
}