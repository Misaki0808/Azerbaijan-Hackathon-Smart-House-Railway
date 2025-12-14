import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
  // Ekran boyutuna göre merkez hesapla
  const getInitialPositions = () => {
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 700;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
    return {
      irrigation: { x: centerX - 250, y: centerY - 130 },
      generator: { x: centerX - 250, y: centerY + 120 },
      solar: { x: centerX + 250, y: centerY - 130 },
      rainSensor: { x: centerX + 250, y: centerY + 120 },
      home: { x: centerX, y: centerY },
      tank: { x: centerX, y: centerY + 240 }
    };
  };

  const initialPos = getInitialPositions();

  const [devices, setDevices] = useState({
    irrigation: { 
      name: 'Sulama Sistemi', icon: '💧', status: false,
      model: 'SIMATIC S7-1200', serial: '6ES7214-1AG40-0XB0', protocol: 'PROFINET',
      soilMoisture: 35, gradient: 'from-blue-500 to-cyan-500', position: initialPos.irrigation
    },
    generator: {
      name: 'Jeneratör', icon: '⚡', status: true,
      model: 'SINAMICS G120C', serial: '6SL3210-1KE21-3UF2', protocol: 'PROFIBUS DP',
      fuelLevel: 78, gradient: 'from-orange-500 to-red-500', position: initialPos.generator
    },
    solar: {
      name: 'Güneş Paneli', icon: '☀️', status: true,
      model: 'SITOP PSU8200', serial: '6EP3436-8SB00-2AY0', protocol: 'Modbus TCP',
      wattProduction: 2450, gradient: 'from-yellow-400 to-orange-400', position: initialPos.solar
    },
    rainSensor: {
      name: 'Yağmur Sensörü', icon: '🌧️', status: true,
      model: 'SITRANS P DS III', serial: '7MF4033-1DA10-1AC6', protocol: 'HART',
      rainDetected: false, gradient: 'from-cyan-400 to-blue-500', position: initialPos.rainSensor
    }
  });

  const [waterTank, setWaterTank] = useState({ 
    current: 35000, capacity: 50000, position: initialPos.tank,
    sensorStatus: 'connected', lastUpdate: new Date().toLocaleTimeString('tr-TR')
  });
  const [homePosition, setHomePosition] = useState(initialPos.home);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showTankModal, setShowTankModal] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [dataFlowActive, setDataFlowActive] = useState(true);

  const getTankColor = () => {
    const percentage = (waterTank.current / waterTank.capacity) * 100;
    if (percentage > 50) return 'bg-blue-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTankPercentage = () => Math.round((waterTank.current / waterTank.capacity) * 100);

  const addAlert = (message, type = 'warning') => {
    const newAlert = { id: Date.now(), message, type };
    setAlerts(prev => [...prev, newAlert]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== newAlert.id)), 4000);
  };

  const toggleDevice = (deviceKey) => {
    if (deviceKey === 'irrigation') {
      // Önce mevcut durumu kontrol et
      const currentStatus = devices.irrigation.status;
      const isRaining = devices.rainSensor.rainDetected;
      
      if (!currentStatus && isRaining) {
        addAlert('⚠️ Yağmur yağıyor! Sulama sistemi açılamaz.', 'error');
        return;
      }
      
      // State'i güncelle
      setDevices(prev => ({
        ...prev,
        irrigation: {
          ...prev.irrigation,
          status: !prev.irrigation.status
        }
      }));
      
      // Bildirim ver
      if (!currentStatus) {
        addAlert('✅ Sulama sistemi açıldı.', 'success');
      } else {
        addAlert('🔴 Sulama sistemi kapatıldı.', 'info');
      }
    } else {
      // Diğer cihazlar için
      setDevices(prev => ({
        ...prev,
        [deviceKey]: {
          ...prev[deviceKey],
          status: !prev[deviceKey].status
        }
      }));
    }
  };

  const resetSystem = () => {
    setWaterTank(prev => ({ ...prev, current: 35000, lastUpdate: new Date().toLocaleTimeString('tr-TR') }));
    setDevices(prev => {
      const newDevices = { ...prev };
      Object.keys(newDevices).forEach(key => {
        newDevices[key].status = false;
        if (key === 'rainSensor') newDevices[key].rainDetected = false;
      });
      newDevices.generator.status = true;
      newDevices.solar.status = true;
      return newDevices;
    });
    setAlerts([]);
    addAlert('🔄 Sistem sıfırlandı.', 'info');
  };

  // Mouse down ile sürükleme başlat
  const handleMouseDown = (e, deviceKey) => {
    if (e.button !== 0) return; // Sadece sol tık
    e.preventDefault();
    e.stopPropagation();
    
    let device;
    if (deviceKey === 'tank') {
      device = waterTank;
    } else if (deviceKey === 'home') {
      device = { position: homePosition };
    } else {
      device = devices[deviceKey];
    }
    
    setDragging(deviceKey);
    setDragOffset({
      x: e.clientX - device.position.x,
      y: e.clientY - device.position.y
    });
  };

  // Sürükleme - çok daha akıcı
  const handleMouseMove = (e) => {
    if (!dragging) return;
    
    setHasDragged(true);
    
    // Doğrudan pozisyon güncelleme - gecikme yok
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    if (dragging === 'tank') {
      setWaterTank(prev => ({ ...prev, position: { x: newX, y: newY } }));
    } else if (dragging === 'home') {
      setHomePosition({ x: newX, y: newY });
    } else {
      setDevices(prev => ({ ...prev, [dragging]: { ...prev[dragging], position: { x: newX, y: newY } } }));
    }
  };

  const handleMouseUp = (deviceKey, openModal) => {
    const didDrag = hasDragged;
    setDragging(null);
    setHasDragged(false);
    
    // Eğer sürükleme yapılmadıysa modal aç
    if (!didDrag && openModal) {
      openModal();
    }
  };

  useEffect(() => {
    if (dragging) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      const onMouseMove = (e) => handleMouseMove(e);
      const onMouseUp = () => {
        setDragging(null);
      };
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      
      return () => {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [dragging, dragOffset]);

  // Yağmur bildirimi için ref (çift bildirimi önlemek için)
  const rainStopNotified = useRef(false);
  const rainStartNotified = useRef(false);

  // Yağmur simülasyonu - Ayrı başlama ve durma zamanlaması
  useEffect(() => {
    let rainStartTimeout;
    let rainStopTimeout;
    let isMounted = true;
    
    const startRainCycle = () => {
      // 15-20 saniye sonra yağmur başlasın
      const startDelay = 15000 + Math.random() * 5000;
      
      rainStartTimeout = setTimeout(() => {
        if (!isMounted) return;
        
        rainStopNotified.current = false; // Reset stop notification flag
        
        setDevices(prev => {
          if (prev.rainSensor.rainDetected) return prev;
          
          const newDevices = { ...prev };
          newDevices.rainSensor.rainDetected = true;
          
          if (!rainStartNotified.current) {
            rainStartNotified.current = true;
            
            if (newDevices.irrigation.status) {
              newDevices.irrigation.status = false;
              addAlert('🌧️ YAĞMUR SAPTANDI!', 'error');
              setTimeout(() => {
                addAlert('💧 Sulama sistemi otomatik olarak kapatıldı.', 'info');
              }, 2000);
            } else {
              addAlert('🌧️ YAĞMUR SAPTANDI!', 'error');
            }
          }
          
          return newDevices;
        });
        
        // 10 saniye sonra yağmur dursun
        rainStopTimeout = setTimeout(() => {
          if (!isMounted) return;
          
          rainStartNotified.current = false; // Reset start notification flag
          
          setDevices(prev => {
            if (!prev.rainSensor.rainDetected) return prev;
            
            if (!rainStopNotified.current) {
              rainStopNotified.current = true;
              addAlert('☀️ Yağmur durdu. Normal operasyona dönüldü.', 'success');
            }
            
            return { ...prev, rainSensor: { ...prev.rainSensor, rainDetected: false } };
          });
          
          // Döngüyü tekrarla
          startRainCycle();
        }, 10000); // 10 saniye yağmur süresi
        
      }, startDelay);
    };
    
    startRainCycle();
    
    return () => {
      isMounted = false;
      clearTimeout(rainStartTimeout);
      clearTimeout(rainStopTimeout);
    };
  }, []);

  // Sensör ile su havuzu takibi - Yağmur/Sulama durumuna göre
  useEffect(() => {
    const sensorInterval = setInterval(() => {
      setWaterTank(prev => {
        let newCurrent = prev.current;
        
        if (devices.rainSensor.rainDetected) {
          // Yağmur yağıyorsa su artsın (100-500 arası)
          const increase = Math.floor(100 + Math.random() * 400);
          newCurrent = Math.min(prev.capacity, prev.current + increase);
        } else if (devices.irrigation.status) {
          // Sulama açıksa su azalsın (100-500 arası)
          const decrease = Math.floor(100 + Math.random() * 400);
          newCurrent = Math.max(0, prev.current - decrease);
        } else {
          // İkisi de yoksa sadece 100ml azalsın
          newCurrent = Math.max(0, prev.current - 100);
        }
        
        return {
          ...prev,
          current: newCurrent,
          lastUpdate: new Date().toLocaleTimeString('tr-TR'),
          sensorStatus: 'connected'
        };
      });
    }, 2000); // 2 saniyede bir güncelleme

    return () => clearInterval(sensorInterval);
  }, [devices.rainSensor.rainDetected, devices.irrigation.status]);

  // Sensör verilerini güncelle (solar, soil moisture vs.)
  useEffect(() => {
    const sensorInterval = setInterval(() => {
      setDevices(prev => {
        // Toprak nemi hesapla
        let soilMoisture;
        if (prev.rainSensor.rainDetected || prev.irrigation.status) {
          // Yağmur yağıyorsa veya sulama açıksa: %50-80 arası
          soilMoisture = Math.floor(50 + Math.random() * 30);
        } else {
          // Normal durumda: %20-50 arası
          soilMoisture = Math.floor(20 + Math.random() * 30);
        }
        
        return {
          ...prev,
          solar: {
            ...prev.solar,
            wattProduction: Math.floor(2000 + Math.random() * 1000)
          },
          irrigation: {
            ...prev.irrigation,
            soilMoisture: soilMoisture
          },
          generator: {
            ...prev.generator,
            fuelLevel: Math.max(10, prev.generator.fuelLevel - Math.random() * 0.5)
          }
        };
      });
    }, 3000);

    return () => clearInterval(sensorInterval);
  }, []);

  const drawConnections = () => {
    const connections = [
      { from: devices.irrigation.position, to: homePosition, color: '#3b82f6' },
      { from: devices.generator.position, to: homePosition, color: '#f97316' },
      { from: devices.solar.position, to: homePosition, color: '#eab308' },
      { from: devices.rainSensor.position, to: homePosition, color: '#06b6d4' },
      { from: homePosition, to: waterTank.position, color: '#10b981' }
    ];

      return connections.map((conn, i) => {
      return (
        <svg key={i} className="absolute pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={conn.color} stopOpacity="0.6" />
              <stop offset="50%" stopColor={conn.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={conn.color} stopOpacity="0.1" />
            </linearGradient>
            <filter id={`glow-${i}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <line
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            stroke={`url(#gradient-${i})`}
            strokeWidth="2"
            filter={`url(#glow-${i})`}
            strokeDasharray="8,4"
            className="animate-dash"
          />
          <circle cx={conn.to.x} cy={conn.to.y} r="5" fill={conn.color} opacity="0.5">
            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    });
  };

  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: '#0a0f1a' }}>
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {alerts.map(alert => (
          <div key={alert.id} className={`px-6 py-3 rounded-xl shadow-lg text-white font-semibold border ${
            alert.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 
            alert.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 
            alert.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 
            'bg-blue-500/20 border-blue-500/50 text-blue-300'
          } animate-pulse-slow backdrop-blur-sm`}>{alert.message}</div>
        ))}
      </div>

      <div className="fixed top-4 left-4 z-40 rounded-2xl p-5 border border-slate-700/50 max-w-xs" style={{ backgroundColor: '#111827' }}>
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="Aqrobloom Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-white">Aqrobloom</h1>
            <p className="text-emerald-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Real-time monitoring active
            </p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#1f2937' }}>
            <span className="text-gray-400">Sahip</span>
            <span className="text-white font-semibold">Ahmet Yılmaz</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#1f2937' }}>
            <span className="text-gray-400">Konum</span>
            <span className="text-white font-semibold">Bakü, Azerbaycan</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: '#1f2937' }}>
            <span className="text-gray-400">Alan</span>
            <span className="text-white font-semibold">500 m²</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-screen" style={{ backgroundColor: '#0a0f1a' }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px'
        }}></div>

        {drawConnections()}

        {/* Ana Bina - Taşınabilir */}
        <div 
          className={`absolute select-none ${dragging === 'home' ? 'z-50' : 'z-20'}`}
          style={{ 
            left: `${homePosition.x}px`, 
            top: `${homePosition.y}px`,
            transform: 'translate(-50%, -50%)',
            cursor: dragging === 'home' ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'home')}
          onMouseUp={() => handleMouseUp('home', null)}
        >
          <div className={`rounded-2xl p-6 border-2 border-emerald-500/50 shadow-2xl transition-all duration-150 ${dragging === 'home' ? 'scale-105' : 'hover:scale-102 hover:border-emerald-400'}`} style={{ backgroundColor: '#111827' }}>
            <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">🏡</span>
            </div>
            <h2 className="text-white text-lg font-bold text-center">Ana Bina</h2>
            <p className="text-gray-400 text-xs text-center mt-1">Merkez Hub</p>
            <div className="mt-3 flex justify-center items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-xs">Aktif</span>
            </div>
            <p className="text-gray-500 text-xs mt-2 text-center">Sürükle veya tıkla</p>
          </div>
        </div>

        {Object.entries(devices).map(([key, device]) => (
          <DraggableNode key={key} device={device} deviceKey={key}
            onMouseDown={(e) => handleMouseDown(e, key)}
            onMouseUp={() => handleMouseUp(key, () => setSelectedDevice({ key }))}
            isDragging={dragging === key} />
        ))}

        <div className={`absolute select-none ${dragging === 'tank' ? 'z-50' : 'z-10'}`}
          style={{ 
            left: `${waterTank.position.x}px`, 
            top: `${waterTank.position.y}px`, 
            transform: 'translate(-50%, -50%)',
            cursor: dragging === 'tank' ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'tank')}
          onMouseUp={() => handleMouseUp('tank', () => setShowTankModal(true))}>
          <div className={`rounded-2xl p-5 shadow-2xl border border-blue-500/30 w-72 transition-transform duration-150 ${dragging === 'tank' ? 'scale-105' : 'hover:scale-102'}`} style={{ backgroundColor: '#111827' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl">💦</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Su Havuzu</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 text-xs">📊</span>
                    <span className="text-gray-400 text-xs">Sensör Takibi</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">{waterTank.current.toLocaleString()}L</p>
                <p className="text-gray-500 text-xs">Son: {waterTank.lastUpdate}</p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#1f2937' }}>
              <div className={`h-full ${getTankPercentage() > 50 ? 'bg-emerald-500' : getTankPercentage() > 20 ? 'bg-yellow-500' : 'bg-red-500'} transition-all duration-1000 ease-out`} style={{width: `${getTankPercentage()}%`}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm font-semibold">{getTankPercentage()}%</span>
              <span className="text-gray-500 text-xs">Kapasite: {waterTank.capacity.toLocaleString()}L</span>
            </div>
            <p className="text-gray-500 text-xs mt-2 text-center">Sürükle veya tıkla</p>
          </div>
        </div>

        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: '#111827' }}>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-xs font-semibold">SENSÖR BAĞLANTISI AKTİF</span>
            </div>
            <button onClick={resetSystem} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold px-4 py-2 rounded-xl transition-all duration-300 text-sm hover:scale-105">🔄 Sıfırla</button>
          </div>
        </div>
      </div>

      {selectedDevice && <DeviceModal device={devices[selectedDevice.key]} deviceKey={selectedDevice.key} onClose={() => setSelectedDevice(null)} toggleDevice={toggleDevice} />}
      {showTankModal && <WaterTankModal waterTank={waterTank} getTankColor={getTankColor} getTankPercentage={getTankPercentage} onClose={() => setShowTankModal(false)} />}

      <div className="fixed bottom-4 right-4 text-gray-500 text-xs"><p>🏭 SIEMENS Technology</p></div>
    </div>
  );
}

function DraggableNode({ device, deviceKey, onMouseDown, onMouseUp, isDragging }) {
  const getIconBgColor = () => {
    if (deviceKey === 'irrigation') return 'bg-blue-500/20';
    if (deviceKey === 'generator') return 'bg-orange-500/20';
    if (deviceKey === 'solar') return 'bg-yellow-500/20';
    if (deviceKey === 'rainSensor') return 'bg-cyan-500/20';
    return 'bg-gray-500/20';
  };

  const getBorderColor = () => {
    if (deviceKey === 'irrigation') return 'border-blue-500/30 hover:border-blue-400/50';
    if (deviceKey === 'generator') return 'border-orange-500/30 hover:border-orange-400/50';
    if (deviceKey === 'solar') return 'border-yellow-500/30 hover:border-yellow-400/50';
    if (deviceKey === 'rainSensor') return 'border-cyan-500/30 hover:border-cyan-400/50';
    return 'border-gray-500/30';
  };

  return (
    <div 
      className={`absolute select-none ${isDragging ? 'z-50' : 'z-10'}`}
      style={{ 
        left: `${device.position.x}px`, 
        top: `${device.position.y}px`, 
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div className={`rounded-2xl p-4 shadow-2xl border w-56 transition-all duration-150 ${getBorderColor()} ${isDragging ? 'scale-105 shadow-xl' : 'hover:scale-102'}`} style={{ backgroundColor: '#111827' }}>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl ${getIconBgColor()} flex items-center justify-center`}>
            <span className="text-2xl">{device.icon}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
            deviceKey === 'rainSensor' 
              ? (device.rainDetected ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30')
              : (device.status ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30')
          }`}>
            {deviceKey === 'rainSensor' ? (device.rainDetected ? 'YAĞIYOR' : 'KURU') : (device.status ? 'AÇIK' : 'KAPALI')}
          </span>
        </div>
        <h3 className="text-white font-bold text-sm mb-1">{device.name}</h3>
        <p className="text-gray-500 text-xs mb-3">{device.model}</p>
        <div className="rounded-xl p-3" style={{ backgroundColor: '#1f2937' }}>
          <p className="text-gray-300 text-xs font-semibold">
            {deviceKey === 'irrigation' && `💧 Nem: ${device.soilMoisture}%`}
            {deviceKey === 'generator' && `⛽ Yakıt: ${Math.round(device.fuelLevel)}%`}
            {deviceKey === 'solar' && `⚡ ${device.wattProduction}W`}
            {deviceKey === 'rainSensor' && (device.rainDetected ? '🌧️ Tespit Edildi' : '☀️ Temiz')}
          </p>
        </div>
        <p className="text-gray-500 text-xs mt-2 text-center">Sürükle veya tıkla</p>
      </div>
    </div>
  );
}

function DeviceModal({ device, deviceKey, onClose, toggleDevice }) {
  const getIconBgColor = () => {
    if (deviceKey === 'irrigation') return 'bg-blue-500/20';
    if (deviceKey === 'generator') return 'bg-orange-500/20';
    if (deviceKey === 'solar') return 'bg-yellow-500/20';
    if (deviceKey === 'rainSensor') return 'bg-cyan-500/20';
    return 'bg-gray-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700/50" style={{ backgroundColor: '#111827' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl ${getIconBgColor()} flex items-center justify-center`}>
              <span className="text-3xl">{device.icon}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{device.name}</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                deviceKey === 'rainSensor' 
                  ? (device.rainDetected ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30')
                  : (device.status ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30')
              }`}>
                {deviceKey === 'rainSensor' ? (device.rainDetected ? 'YAĞIYOR' : 'KURU') : (device.status ? 'AÇIK' : 'KAPALI')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl transition-colors">×</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
            <p className="text-gray-500 text-sm">Model</p>
            <p className="text-white font-semibold">{device.model}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
            <p className="text-gray-500 text-sm">Seri No</p>
            <p className="text-white font-mono text-sm">{device.serial}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
            <p className="text-gray-500 text-sm">Protokol</p>
            <p className="text-white font-semibold">{device.protocol}</p>
          </div>
          
          {deviceKey === 'irrigation' && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
              <p className="text-gray-500 text-sm mb-2">Toprak Nemi</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-full h-2" style={{ backgroundColor: '#374151' }}>
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{width: `${device.soilMoisture}%`}}></div>
                </div>
                <span className="text-white font-bold">{device.soilMoisture}%</span>
              </div>
            </div>
          )}
          
          {deviceKey === 'generator' && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
              <p className="text-gray-500 text-sm mb-2">Yakıt Seviyesi</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-full h-2" style={{ backgroundColor: '#374151' }}>
                  <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{width: `${device.fuelLevel}%`}}></div>
                </div>
                <span className="text-white font-bold">{Math.round(device.fuelLevel)}%</span>
              </div>
            </div>
          )}
          
          {deviceKey === 'solar' && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
              <p className="text-gray-500 text-sm">Üretim Gücü</p>
              <p className="text-yellow-400 font-bold text-2xl">{device.wattProduction}W</p>
            </div>
          )}
          
          {deviceKey === 'rainSensor' && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
              <p className="text-gray-500 text-sm">Yağmur Durumu</p>
              <p className={`font-bold text-xl ${device.rainDetected ? 'text-cyan-400' : 'text-gray-400'}`}>
                {device.rainDetected ? '🌧️ Yağıyor' : '☀️ Yağmur Yok'}
              </p>
            </div>
          )}
        </div>
        
        {deviceKey !== 'rainSensor' && (
          <button onClick={() => toggleDevice(deviceKey)}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              device.status 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' 
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
            }`}>
            {device.status ? '🔴 KAPAT' : '🟢 AÇ'}
          </button>
        )}
      </div>
    </div>
  );
}

function WaterTankModal({ waterTank, getTankColor, getTankPercentage, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700/50" style={{ backgroundColor: '#111827' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-3xl">💦</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Su Havuzu Takibi</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-xs">Sensör Bağlantısı Aktif</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl transition-colors">×</button>
        </div>
        
        <div className="space-y-4">
          <div className="rounded-xl p-6" style={{ backgroundColor: '#1f2937' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500">Mevcut Seviye</span>
              <span className="text-white font-bold text-2xl">{waterTank.current.toLocaleString()}L</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500">Kapasite</span>
              <span className="text-white font-bold">{waterTank.capacity.toLocaleString()}L</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#374151' }}>
              <div className={`h-full ${getTankPercentage() > 50 ? 'bg-emerald-500' : getTankPercentage() > 20 ? 'bg-yellow-500' : 'bg-red-500'} transition-all duration-1000 ease-out`} style={{width: `${getTankPercentage()}%`}}></div>
            </div>
            <p className="text-center text-white font-bold text-xl">{getTankPercentage()}%</p>
          </div>
          
          <div className="rounded-xl p-4" style={{ backgroundColor: '#1f2937' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <span className="text-gray-400">Sensör Verisi</span>
              </div>
              <span className="text-gray-500 text-sm">Son: {waterTank.lastUpdate}</span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm text-center">
              📊 Su seviyesi havuz sensörü ile otomatik olarak izlenmektedir. Manuel müdahale gerekmemektedir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
