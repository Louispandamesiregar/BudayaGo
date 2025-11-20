'use client';

import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useState } from 'react'; 
import dataMaster from '../data/budaya.json'; 
import CityAssistant from './CityAssistant'; // <-- Komponen AI

// --- TIPE DATA ---
interface MasterData {
    nama: string;
    info: { [key: string]: string[] | string };
    KotaKabupaten: { nama: string; deskripsi?: string; wisata?: string[] }[]; 
}

interface ActiveProvince {
  feature: any;
  position: THREE.Vector3;
}

type ViewMode = 'info_budaya' | 'daftar_kota' | 'detail_kota';

// FUNGSI HELPER: Mengubah nama GeoJSON menjadi KEY JSON
const getProvinceKey = (name: string): string => {
  return name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
};

// --- KOMPONEN HOLOGRAM UTAMA ---

export default function Hologram({ activeProvince, onClose }: { activeProvince: ActiveProvince; onClose: () => void; }) {
    
  if (!activeProvince || !activeProvince.feature || !activeProvince.feature.properties) {
    return null;
  }

  const { feature } = activeProvince;
  const { name } = feature.properties;
  
  const provinceKey = getProvinceKey(name);
  const data = (dataMaster as any)[provinceKey] as MasterData | undefined;

  const [viewMode, setViewMode] = useState<ViewMode>('daftar_kota'); 
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  
  
  if (!name || !data) {
    return (
        <Html position={activeProvince.position.toArray()} center as="div">
            <div className="hologram-container w-96 rounded-lg bg-gray-800 bg-opacity-70 p-4 text-white" style={{ backdropFilter: 'blur(10px)' }}>
                 <div className="flex items-start justify-between">
                     <h2 className="mb-2 text-xl font-bold text-cyan-300">Data Tidak Ditemukan</h2>
                     <button onClick={onClose} className="leading-none text-gray-300 hover:text-white">&times;</button>
                 </div>
                 <p>Provinsi {name} (Key: {provinceKey}) belum memiliki data lengkap di **budaya.json**.</p>
            </div>
        </Html>
    );
  }

  const handleCityClick = (kotaNama: string) => {
    setSelectedCity(kotaNama);
    setViewMode('detail_kota'); 
  };

  const renderContent = () => {
    
    // 1. DAFTAR KOTA
    if (viewMode === 'daftar_kota') {
      if (!data.KotaKabupaten || data.KotaKabupaten.length === 0) {
          return <p className="mt-2 text-sm text-gray-300">Daftar kota belum tersedia.</p>;
      }
        
      return (
        <>
          <h3 className="text-md font-semibold text-cyan-400 mb-3">Pilih Kota/Kabupaten</h3>
          <ul className="mt-2 text-sm text-gray-200 max-h-40 overflow-y-auto list-none pl-0">
            {data.KotaKabupaten.map((kotaObj, index) => (
              <li 
                key={index}
                onClick={() => handleCityClick(kotaObj.nama)}
                className="cursor-pointer py-1 border-b border-gray-700 hover:text-cyan-300 transition-colors"
              >
                {kotaObj.nama}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => setViewMode('info_budaya')} 
            className="mt-3 text-xs text-gray-400 hover:text-white underline"
          >
            &larr; Lihat Info Budaya Provinsi
          </button>
        </>
      );
    }

    // 2. INFO BUDAYA 
    if (viewMode === 'info_budaya') {
      if (!data.info) {
          return <p className="mt-2 text-sm text-gray-300">Informasi budaya tidak tersedia.</p>;
      }
        
      return (
        <>
          <h3 className="text-md font-semibold text-cyan-400">Informasi Budaya</h3>
          <ul className="mt-2 list-disc list-inside text-sm text-gray-200">
            {Object.entries(data.info).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {(Array.isArray(value) ? value.join(', ') : value)}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => setViewMode('daftar_kota')} 
            className="mt-3 text-xs text-gray-400 hover:text-white underline"
          >
            &larr; Lihat Daftar Kota
          </button>
        </>
      );
    }
    
    // 3. DETAIL KOTA --> PANGGIL KOMPONEN AI
    if (viewMode === 'detail_kota') {
        // Mengembalikan komponen CityAssistant
        return (
            <CityAssistant 
                selectedCity={selectedCity || data.nama} 
                onClose={() => setViewMode('daftar_kota')} 
            />
        );
    }

    return null;
  };


  return (
    <Html
      position={activeProvince.position.toArray()}
      center
      as="div"
    >
      <div 
        className="hologram-container w-96 rounded-lg bg-gray-800 bg-opacity-70 p-4 text-white"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-start justify-between">
          <h2 className="mb-2 text-xl font-bold text-cyan-300">{data.nama || name}</h2>
          {/* Tombol Tutup modal utama */}
          <button onClick={onClose} className="leading-none text-gray-300 hover:text-white">&times;</button>
        </div>
        
        <div className="mt-2">
          {renderContent()}
        </div>
        
      </div>
    </Html>
  );
}