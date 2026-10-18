import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Search,
  Crosshair,
  Compass,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clipboard,
  Building,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  Power,
} from 'lucide-react';
import { useToast } from '../context/ToastModalContext';

export default function GpsLocationPicker({
  initialLat = -0.245892,
  initialLng = 116.591230,
  initialRadius = 100,
  initialRadiusActive = true,
  schoolName = 'SMP NEGERI 2 KOTA BANGUN',
  onChange,
  onAutoSaveToggle,
  onSaveGpsSettings,
}) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState('2d'); // '2d' | '3d'
  const [mapType, setMapType] = useState('google_hybrid'); // 'google_hybrid' | 'google_street' | 'osm' | 'satellite'

  const [lat, setLat] = useState(() => Number(initialLat) || -0.245892);
  const [lng, setLng] = useState(() => Number(initialLng) || 116.591230);
  const [radius, setRadius] = useState(() => Number(initialRadius) || 100);
  const [radiusActive, setRadiusActive] = useState(() => initialRadiusActive !== false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [detectingGps, setDetectingGps] = useState(false);

  // Google Maps Coordinates Paste Input
  const [gmapsPasteInput, setGmapsPasteInput] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState(null);

  // 3D Canvas Controls
  const [rotationAngle, setRotationAngle] = useState(45); // 0 - 360
  const [tiltAngle, setTiltAngle] = useState(60); // 30 - 80

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const tileLayerRef = useRef(null);

  const canvas3dRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const radarSweepAngleRef = useRef(0);

  // Sinkronisasi prop awal jika berubah dari luar
  useEffect(() => {
    if (initialLat && !isNaN(Number(initialLat))) setLat(Number(initialLat));
    if (initialLng && !isNaN(Number(initialLng))) setLng(Number(initialLng));
    if (initialRadius && !isNaN(Number(initialRadius))) setRadius(Number(initialRadius));
    if (initialRadiusActive !== undefined) setRadiusActive(initialRadiusActive !== false);
  }, [initialLat, initialLng, initialRadius, initialRadiusActive]);

  // Notifikasi perubahan ke parent
  const notifyChange = (newLat, newLng, newRadius, newRadiusActive = radiusActive) => {
    if (onChange) {
      onChange({
        lat: Number(newLat).toFixed(6),
        lng: Number(newLng).toFixed(6),
        radius: Number(newRadius),
        radiusActive: Boolean(newRadiusActive),
      });
    }
  };

  // Helper membuat Tile Layer sesuai mapType
  function createTileLayer(type) {
    if (type === 'google_hybrid') {
      return L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps Satelit & Label',
        maxZoom: 20,
      });
    } else if (type === 'google_street') {
      return L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps Jalan',
        maxZoom: 20,
      });
    } else if (type === 'satellite') {
      return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      });
    } else {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
    }
  }

  // =========================================================================
  // 1. INISIALISASI & KONTROL PETA LEAFLET 2D
  // =========================================================================
  useEffect(() => {
    if (viewMode !== '2d') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Inisialisasi Peta
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: false,
      });

      // Layer Default (Google Hybrid Satelit)
      const layer = createTileLayer(mapType);
      layer.addTo(map);
      tileLayerRef.current = layer;

      // Custom School Gate Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-gate-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
            <div class="w-10 h-10 bg-blue-600 border-2 border-white rounded-2xl shadow-xl flex items-center justify-center text-white text-lg ring-4 ring-blue-500/30 animate-bounce">
              🏫
            </div>
            <div class="absolute -bottom-1 w-2.5 h-2.5 bg-blue-600 rotate-45 border-r border-b border-white"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      // Marker
      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #1e293b;">
          📍 <strong>Titik ${schoolName}</strong><br/>
          <span style="font-size: 10px; color: #64748b;">Geser pin ini untuk menentukan titik presensi tepat</span>
        </div>
      `);

      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        notifyChange(position.lat, position.lng, radius);
      });

      markerRef.current = marker;

      // Geofence Circle
      const circle = L.circle([lat, lng], {
        radius: radius,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.22,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      circleRef.current = circle;

      // Klik langsung di peta untuk memindahkan pin
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLng(clickLng);
        marker.setLatLng([clickLat, clickLng]);
        circle.setLatLng([clickLat, clickLng]);
        notifyChange(clickLat, clickLng, radius);
      });

      mapInstanceRef.current = map;
    } else {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }
  }, [viewMode]);

  // Update posisi marker & lingkaran saat lat/lng/radius/radiusActive berubah
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(radius);
      if (radiusActive) {
        circleRef.current.setStyle({
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.22,
          weight: 2,
          dashArray: '6, 6',
        });
      } else {
        circleRef.current.setStyle({
          color: '#94a3b8',
          fillColor: '#cbd5e1',
          fillOpacity: 0.06,
          weight: 1.5,
          dashArray: '4, 8',
        });
      }
    }
  }, [lat, lng, radius, radiusActive]);

  // Switch Layer Map (Google Satelit vs Google Jalan vs OSM)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = createTileLayer(mapType);
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Parse Koordinat / Tautan yang Ditempel dari Google Maps
  function handleApplyGoogleCoordinates(e) {
    e?.preventDefault();
    if (!gmapsPasteInput.trim()) return;

    const input = gmapsPasteInput.trim();

    // Regex mencocokkan format "lat, lng" atau format URL Google Maps
    // Contoh: "-0.245892, 116.591230" atau "https://www.google.com/maps?q=-0.245892,116.591230"
    const regex = /(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
    const match = input.match(regex);

    if (match) {
      const parsedLat = parseFloat(match[1]);
      const parsedLng = parseFloat(match[2]);

      if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        setLat(parsedLat);
        setLng(parsedLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([parsedLat, parsedLng], 18);
        }
        notifyChange(parsedLat, parsedLng, radius);
        setPasteFeedback({ success: true, message: `Berhasil! Koordinat Google Maps disetel: ${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)}` });
        setGmapsPasteInput('');
        setTimeout(() => setPasteFeedback(null), 4000);
        return;
      }
    }

    setPasteFeedback({ success: false, message: 'Format koordinat tidak dikenali. Contoh yang benar: -0.245892, 116.591230' });
    setTimeout(() => setPasteFeedback(null), 4000);
  }

  // Cari Lokasi lewat Nominatim OpenStreetMap
  async function handleSearchLocation(e) {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);
    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, Indonesia`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('Gagal mencari lokasi:', err);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSearchResult(item) {
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);
    setLat(newLat);
    setLng(newLng);
    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 17);
    }
    notifyChange(newLat, newLng, radius);
  }

  // Deteksi Lokasi Sekarang menggunakan GPS Browser
  function handleDetectCurrentLocation() {
    if (!navigator.geolocation) {
      toast.warning('Perangkat atau browser Anda tidak mendukung fitur Geolocation GPS.', 'GPS Tidak Didukung');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const curLat = pos.coords.latitude;
        const curLng = pos.coords.longitude;
        setLat(curLat);
        setLng(curLng);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([curLat, curLng], 18);
        }
        notifyChange(curLat, curLng, radius);
        setDetectingGps(false);
        toast.success('Koordinat GPS berhasil terdeteksi dari posisi Anda saat ini.');
      },
      (err) => {
        toast.error(`Gagal mengambil koordinat GPS: ${err.message}. Pastikan izin lokasi browser aktif.`, 'GPS Gagal');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // =========================================================================
  // 2. VISUALIZER 3D RADAR GEOFENCE (CANVAS 3D ISOMETRIC)
  // =========================================================================
  useEffect(() => {
    if (viewMode !== '3d') {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      return;
    }

    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let isRunning = true;

    // Titik simulasi siswa di sekitar titik sekolah
    const dummyStudents = [
      { name: 'Budi (Siswa)', distFactor: 0.35, angle: 0.6, valid: true },
      { name: 'Siti (Siswa)', distFactor: 0.75, angle: 2.1, valid: true },
      { name: 'Rian (Siswa)', distFactor: 0.90, angle: 4.2, valid: true },
      { name: 'Dimas (Luar Radius)', distFactor: 1.45, angle: 1.2, valid: false },
      { name: 'Eka (Luar Radius)', distFactor: 1.80, angle: 3.5, valid: false },
    ];

    function render3DScene() {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Titik Pusat Proyeksi 3D
      const centerX = width / 2;
      const centerY = height * 0.58;

      // Konversi Sudut Isometrik
      const radRot = (rotationAngle * Math.PI) / 180;
      const tiltFactor = Math.sin((tiltAngle * Math.PI) / 180);

      // Skala Visual Radius
      const baseVisualRadius = Math.min(width, height) * 0.32;
      const radiusScale = (radius / 100) * baseVisualRadius;

      // 1. Gambar Grid Tanah Isometrik 3D
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;

      const gridSize = 160;
      const gridStep = 20;

      for (let x = -gridSize; x <= gridSize; x += gridStep) {
        for (let y = -gridSize; y <= gridSize; y += gridStep) {
          const rx1 = x * Math.cos(radRot) - y * Math.sin(radRot);
          const ry1 = (x * Math.sin(radRot) + y * Math.cos(radRot)) * tiltFactor;

          const rx2 = (x + gridStep) * Math.cos(radRot) - y * Math.sin(radRot);
          const ry2 = ((x + gridStep) * Math.sin(radRot) + y * Math.cos(radRot)) * tiltFactor;

          ctx.beginPath();
          ctx.moveTo(centerX + rx1, centerY + ry1);
          ctx.lineTo(centerX + rx2, centerY + ry2);
          ctx.stroke();

          const ry3 = (x * Math.sin(radRot) + (y + gridStep) * Math.cos(radRot)) * tiltFactor;
          const rx3 = x * Math.cos(radRot) - (y + gridStep) * Math.sin(radRot);

          ctx.beginPath();
          ctx.moveTo(centerX + rx1, centerY + ry1);
          ctx.lineTo(centerX + rx3, centerY + ry3);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 2. Gambar Cincin Jarak (Buffer Rings)
      const rings = [0.25, 0.5, 0.75, 1.0];
      rings.forEach((ringPct) => {
        const rX = radiusScale * ringPct;
        const rY = rX * tiltFactor;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, rX, rY, 0, 0, Math.PI * 2);
        if (ringPct === 1.0) {
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();
        ctx.restore();
      });

      // 3. Efek Radar Scan Beam Berputar 360 Derajat
      radarSweepAngleRef.current += 0.025;
      const sweepAngle = radarSweepAngleRef.current;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const sweepEndX = centerX + Math.cos(sweepAngle) * radiusScale;
      const sweepEndY = centerY + Math.sin(sweepAngle) * radiusScale * tiltFactor;
      ctx.lineTo(sweepEndX, sweepEndY);

      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusScale);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 4. Gambar Kubah Silinder 3D Transparan Geofence
      const domeHeight = 55;
      ctx.save();
      const cylinderGrad = ctx.createLinearGradient(0, centerY - domeHeight, 0, centerY);
      cylinderGrad.addColorStop(0, 'rgba(37, 99, 235, 0.05)');
      cylinderGrad.addColorStop(1, 'rgba(37, 99, 235, 0.35)');

      ctx.beginPath();
      ctx.ellipse(centerX, centerY - domeHeight, radiusScale, radiusScale * tiltFactor, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dinding kubah
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - domeHeight, radiusScale, radiusScale * tiltFactor, 0, 0, Math.PI);
      ctx.ellipse(centerX, centerY, radiusScale, radiusScale * tiltFactor, 0, Math.PI, 0, true);
      ctx.fillStyle = cylinderGrad;
      ctx.fill();
      ctx.restore();

      // 5. Gambar Titik Sekolah 3D di Pusat (0, 0)
      ctx.save();
      const pillarW = 8;
      const pillarH = 32;

      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(centerX - 16, centerY - pillarH, pillarW, pillarH);
      ctx.fillRect(centerX + 8, centerY - pillarH, pillarW, pillarH);

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(centerX - 20, centerY - pillarH - 8, 40, 8);

      ctx.beginPath();
      ctx.moveTo(centerX - 24, centerY - pillarH - 8);
      ctx.lineTo(centerX, centerY - pillarH - 22);
      ctx.lineTo(centerX + 24, centerY - pillarH - 8);
      ctx.fillStyle = '#e11d48';
      ctx.fill();

      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(`TITIK SEKOLAH: ${schoolName}`, centerX, centerY + 18);
      ctx.font = 'bold 9px monospace';
      if (radiusActive) {
        ctx.fillStyle = '#2563eb';
        ctx.fillText(`RADIUS: ${radius} METER (AKTIF)`, centerX, centerY + 30);
      } else {
        ctx.fillStyle = '#d97706';
        ctx.fillText(`RADIUS: ${radius}M (NONAKTIF / BEBAS LOKASI)`, centerX, centerY + 30);
      }
      ctx.restore();

      // 6. Gambar Titik-titik Simulasi Siswa
      dummyStudents.forEach((st) => {
        const studentDist = radiusScale * st.distFactor;
        const stAngle = st.angle + radRot;
        const stX = centerX + Math.cos(stAngle) * studentDist;
        const stY = centerY + Math.sin(stAngle) * studentDist * tiltFactor;

        ctx.save();
        ctx.beginPath();
        ctx.arc(stX, stY, 5, 0, Math.PI * 2);
        ctx.fillStyle = st.valid ? '#10b981' : '#f43f5e';
        ctx.shadowColor = st.valid ? '#10b981' : '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(stX, stY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = st.valid ? '#065f46' : '#9f1239';
        ctx.textAlign = 'center';
        ctx.fillText(st.name, stX, stY - 8);
        ctx.restore();
      });

      animationFrameIdRef.current = requestAnimationFrame(render3DScene);
    }

    render3DScene();

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [viewMode, radius, radiusActive, rotationAngle, tiltAngle, schoolName]);

  return (
    <div className="space-y-4">
      {/* KONTROL ON/OFF RADIUS GEOFENCE PRESENSI */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          radiusActive
            ? 'bg-linear-to-r from-blue-50/90 via-indigo-50/50 to-emerald-50/40 border-blue-200 shadow-xs'
            : 'bg-linear-to-r from-amber-50/90 via-orange-50/50 to-slate-50 border-amber-300 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                radiusActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-amber-500 text-white shadow-sm'
              }`}
            >
              {radiusActive ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  Batasan Radius Geofence Presensi
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                    radiusActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      radiusActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {radiusActive ? 'RADIUS AKTIF (ON)' : 'RADIUS NONAKTIF / FLEKSIBEL (OFF)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {radiusActive
                  ? `Siswa wajib berada dalam batas radius toleransi buffer (${radius} meter) di sekitar titik sekolah saat melakukan absensi.`
                  : 'Mode Fleksibel Aktif: Siswa & Guru dapat melakukan absensi dari mana saja tanpa syarat jarak koordinat geofence (bebas lokasi).'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center bg-white/80 backdrop-blur-xs p-1.5 px-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Status Fitur
              </span>
              <span
                className={`text-xs font-bold ${
                  radiusActive ? 'text-blue-700' : 'text-amber-700'
                }`}
              >
                {radiusActive ? 'Wajib Radius' : 'Bebas Lokasi'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={radiusActive}
              onClick={() => {
                const nextVal = !radiusActive;
                setRadiusActive(nextVal);
                notifyChange(lat, lng, radius, nextVal);
                if (onAutoSaveToggle) {
                  onAutoSaveToggle(nextVal);
                }
              }}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                radiusActive ? 'bg-blue-600' : 'bg-slate-300 hover:bg-slate-400'
              }`}
              title={radiusActive ? 'Klik untuk mematikan batasan radius (Fleksibel/Bebas Lokasi)' : 'Klik untuk mengaktifkan batasan radius (Wajib Radius)'}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  radiusActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* HEADER CONTROL BAR: SWITCHER MODE 2D/3D & PILIHAN LAYER GOOGLE MAPS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/90 p-2.5 rounded-2xl border border-slate-200">
        {/* Switcher Mode 2D vs 3D */}
        <div className="inline-flex bg-white p-1 rounded-xl shadow-xs border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '2d' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Peta 2D (Google Maps)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '3d' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radar Geofence 3D</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === '2d' && (
            <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMapType('google_hybrid')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  mapType === 'google_hybrid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Google Maps Citra Satelit Asli dengan Label Jalan"
              >
                Google Satelit
              </button>
              <button
                type="button"
                onClick={() => setMapType('google_street')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  mapType === 'google_street' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Google Maps Peta Jalan Standar"
              >
                Google Peta
              </button>
              <button
                type="button"
                onClick={() => setMapType('osm')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  mapType === 'osm' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Peta OpenStreetMap"
              >
                OSM
              </button>
            </div>
          )}

          <a
            href={`https://www.google.com/maps?q=${lat},${lng}&z=18`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Buka titik koordinat saat ini langsung di website / aplikasi Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka di Google Maps ↗</span>
          </a>

          <button
            type="button"
            onClick={handleDetectCurrentLocation}
            disabled={detectingGps}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Kunci titik sekolah menggunakan koordinat GPS perangkat Anda saat ini"
          >
            <Crosshair className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
            <span>{detectingGps ? 'Mencari...' : 'GPS Lokasi Saya'}</span>
          </button>
        </div>
      </div>

      {/* QUICK PASTE GOOGLE MAPS COORDINATES BAR */}
      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
        <form onSubmit={handleApplyGoogleCoordinates} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Clipboard className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={gmapsPasteInput}
              onChange={(e) => setGmapsPasteInput(e.target.value)}
              placeholder="Tempel koordinat / link dari Google Maps (Contoh: -0.245892, 116.591230)..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Terapkan Koordinat
          </button>
        </form>

        {pasteFeedback && (
          <div
            className={`text-xs p-2 rounded-xl flex items-center gap-2 animate-in fade-in ${
              pasteFeedback.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {pasteFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pasteFeedback.message}</span>
          </div>
        )}
      </div>

      {/* SEARCH BOX (KHUSUS MODE 2D) */}
      {viewMode === '2d' && (
        <div className="relative">
          <form onSubmit={handleSearchLocation} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama lokasi / kelurahan / kecamatan (contoh: Kota Bangun, Kutai Kartanegara)..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {searching ? 'Mencari...' : 'Cari Wilayah'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-[1500] overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2.5 hover:bg-blue-50 text-xs text-slate-800 flex items-start gap-2 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block leading-tight">{item.display_name.split(',')[0]}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{item.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEWPORT AREA (2D MAP / 3D CANVAS) */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-900">
        {/* MODE 2D: LEAFLET MAP DENGAN TILE GOOGLE MAPS ASLI */}
        <div
          ref={mapContainerRef}
          className={`w-full h-[380px] sm:h-[440px] transition-opacity ${
            viewMode === '2d' ? 'block' : 'hidden'
          }`}
        />

        {/* MODE 3D: CANVAS RADAR GEOFENCE */}
        {viewMode === '3d' && (
          <div className="relative w-full h-[380px] sm:h-[440px] bg-slate-950 flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvas3dRef}
              width={800}
              height={440}
              className="w-full h-full object-cover"
            />

            {/* 3D Overlay Controls */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400">Rotasi 3D:</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(Number(e.target.value))}
                  className="w-24 sm:w-32 accent-blue-500 cursor-pointer"
                />
                <span className="font-mono text-[11px]">{rotationAngle}°</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400">Sudut Kemiringan:</span>
                <input
                  type="range"
                  min="30"
                  max="80"
                  value={tiltAngle}
                  onChange={(e) => setTiltAngle(Number(e.target.value))}
                  className="w-24 sm:w-32 accent-blue-500 cursor-pointer"
                />
                <span className="font-mono text-[11px]">{tiltAngle}°</span>
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Valid ({radius}m)
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-bold ml-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Ditolak (Luar Radius)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2D Map Status Badges */}
        {viewMode === '2d' && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-[1000]">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md text-xs text-slate-800 font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Klik peta atau geser pin untuk menentukan titik sekolah</span>
            </div>
            <div className="bg-emerald-950/80 text-emerald-200 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Format Koordinat: WGS 84 (Sesuai Google Maps)</span>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS & REALTIME COORDINATE FIELDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Latitude Titik Sekolah
          </label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setLat(val);
              notifyChange(val, lng, radius);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Longitude Titik Sekolah
          </label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setLng(val);
              notifyChange(lat, val, radius);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <span>Radius Toleransi Geofence</span>
              {!radiusActive && (
                <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md font-bold">
                  Tersimpan (Mode Fleksibel)
                </span>
              )}
            </label>
            <span
              className={`text-xs font-bold font-mono ${
                radiusActive ? 'text-blue-700' : 'text-slate-400'
              }`}
            >
              {radius} Meter
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="500"
            step="5"
            value={radius}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setRadius(val);
              notifyChange(lat, lng, val, radiusActive);
            }}
            className={`w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg mt-2 ${
              !radiusActive ? 'opacity-60' : ''
            }`}
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>20m (Ketat)</span>
            <span>100m (Standar)</span>
            <span>500m (Luas)</span>
          </div>
        </div>
      </div>

      {onSaveGpsSettings && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onSaveGpsSettings({ lat, lng, radius, radiusActive })}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Simpan Koordinat, Radius & Status Lokasi Sekarang</span>
          </button>
        </div>
      )}
    </div>
  );
}
