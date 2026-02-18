import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Cpu, 
  Lightbulb, 
  Zap, 
  Play, 
  Square, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Terminal as ConsoleIcon, 
  Settings, 
  Layers,
  MousePointer2,
  RotateCw,
  Info,
  Save,
  Grid,
  Volume2,
  Sun,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---

type ComponentType = 'ARDUINO' | 'ESP32' | 'LED' | 'RESISTOR' | 'BUTTON' | 'POTENTIOMETER' | 'BUZZER' | 'RGB_LED' | 'PHOTO_RESISTOR';

interface Pin {
  id: string;
  name: string;
  type: 'digital' | 'analog' | 'power' | 'ground';
  x: number; // relative to template width
  y: number; // relative to template height
}

interface ComponentInstance {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number;
  state: Record<string, any>;
}

interface Wire {
  id: string;
  from: { componentId: string; pinId: string };
  to: { componentId: string; pinId: string };
  color: string;
}

interface Project {
  name: string;
  code: string;
  components: ComponentInstance[];
  wires: Wire[];
}

// --- Constants & Config ---

const GRID_SIZE = 20;
const COLORS = {
  bg: '#081410',
  surface: '#0f2f24',
  surfaceLight: '#1a4d3c',
  accent: '#00ff9d',
  accentGlow: 'rgba(0, 255, 157, 0.4)',
  danger: '#ff4b4b',
  text: '#e0f2f1',
  textDim: '#7a9e91',
};

const COMPONENT_TEMPLATES: Record<ComponentType, { width: number; height: number; pins: Pin[] }> = {
  ARDUINO: {
    width: 200,
    height: 280,
    pins: [
      { id: '13', name: 'D13', type: 'digital', x: 170, y: 15 },
      { id: '12', name: 'D12', type: 'digital', x: 155, y: 15 },
      { id: '11', name: 'D11', type: 'digital', x: 140, y: 15 },
      { id: '10', name: 'D10', type: 'digital', x: 125, y: 15 },
      { id: 'GND', name: 'GND', type: 'ground', x: 100, y: 15 },
      { id: '5V', name: '5V', type: 'power', x: 70, y: 265 },
      { id: 'GND_P', name: 'GND', type: 'ground', x: 100, y: 265 },
      { id: 'A0', name: 'A0', type: 'analog', x: 170, y: 265 },
    ],
  },
  ESP32: {
    width: 140,
    height: 200,
    pins: [
      { id: 'GND', name: 'GND', type: 'ground', x: 15, y: 30 },
      { id: 'D4', name: 'D4', type: 'digital', x: 15, y: 50 },
      { id: 'D2', name: 'D2', type: 'digital', x: 15, y: 70 },
      { id: 'RX2', name: 'RX2', type: 'digital', x: 15, y: 90 },
      { id: '3V3', name: '3V3', type: 'power', x: 125, y: 30 },
      { id: 'D5', name: 'D5', type: 'digital', x: 125, y: 50 },
      { id: 'D18', name: 'D18', type: 'digital', x: 125, y: 70 },
      { id: 'TX2', name: 'TX2', type: 'digital', x: 125, y: 90 },
    ],
  },
  LED: {
    width: 40,
    height: 80,
    pins: [
      { id: 'A', name: 'Anode (+)', type: 'digital', x: 12, y: 75 },
      { id: 'K', name: 'Cathode (-)', type: 'ground', x: 28, y: 75 },
    ],
  },
  RGB_LED: {
    width: 60,
    height: 80,
    pins: [
      { id: 'R', name: 'Red', type: 'digital', x: 10, y: 75 },
      { id: 'K', name: 'Cathode', type: 'ground', x: 25, y: 75 },
      { id: 'G', name: 'Green', type: 'digital', x: 40, y: 75 },
      { id: 'B', name: 'Blue', type: 'digital', x: 55, y: 75 },
    ],
  },
  BUTTON: {
    width: 60,
    height: 60,
    pins: [
      { id: '1', name: 'Pin 1', type: 'digital', x: 5, y: 30 },
      { id: '2', name: 'Pin 2', type: 'digital', x: 55, y: 30 },
    ],
  },
  RESISTOR: {
    width: 100,
    height: 30,
    pins: [
      { id: '1', name: 'P1', type: 'digital', x: 5, y: 15 },
      { id: '2', name: 'P2', type: 'digital', x: 95, y: 15 },
    ],
  },
  POTENTIOMETER: {
    width: 70,
    height: 80,
    pins: [
      { id: 'VCC', name: 'VCC', type: 'power', x: 15, y: 70 },
      { id: 'OUT', name: 'OUT', type: 'analog', x: 35, y: 70 },
      { id: 'GND', name: 'GND', type: 'ground', x: 55, y: 70 },
    ],
  },
  BUZZER: {
    width: 60,
    height: 60,
    pins: [
      { id: 'POS', name: '+', type: 'digital', x: 15, y: 55 },
      { id: 'NEG', name: '-', type: 'ground', x: 45, y: 55 },
    ],
  },
  PHOTO_RESISTOR: {
    width: 40,
    height: 60,
    pins: [
      { id: '1', name: 'P1', type: 'digital', x: 10, y: 55 },
      { id: '2', name: 'P2', type: 'digital', x: 30, y: 55 },
    ],
  },
};

const DEFAULT_CODE = `/**
 * VoltForge IDE - Circuit Simulation
 * Professional Electronics Workspace
 */

async function setup() {
  console.log("Hardware Initialized...");
  pinMode(13, OUTPUT);
}

async function loop() {
  digitalWrite(13, HIGH);
  await delay(1000);
  digitalWrite(13, LOW);
  await delay(500);
}`;

// --- Visual Header Component for MCUs ---

const HeaderRow = ({ pins, x, y, width, isTop = true }: { pins: Pin[], x: number, y: number, width: number, isTop?: boolean }) => (
  <div 
    className="absolute bg-[#1a1a1a] rounded-sm flex items-center justify-around px-1 shadow-md border border-white/5"
    style={{ left: x, top: y, width: width, height: 20 }}
  >
    {pins.map(p => (
      <div key={p.id} className="w-3 h-3 bg-[#0a0a0a] border border-zinc-700 rounded-sm flex items-center justify-center relative">
        <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full shadow-inner" />
        <div className="absolute -top-3 text-[5px] font-bold text-zinc-500">{p.name}</div>
      </div>
    ))}
  </div>
);

// --- UI Components ---

const IconButton = ({ icon: Icon, onClick, active = false, label = "", variant = "ghost" }: any) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition-all flex items-center gap-2 group relative border border-transparent
      ${variant === 'primary' ? 'bg-[#00ff9d] text-[#081410] hover:bg-[#00cc7d] shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 
        active ? 'bg-[#1a4d3c] text-[#00ff9d] border-[#00ff9d]/30' : 'text-[#7a9e91] hover:bg-[#1a4d3c] hover:text-[#00ff9d]'}`}
    title={label}
  >
    <Icon size={18} />
    {label && <span className="text-xs font-bold tracking-tight">{label}</span>}
  </button>
);

const ArduinoVisual = () => {
  const template = COMPONENT_TEMPLATES.ARDUINO;
  const topPins = template.pins.filter(p => p.y < template.height / 2);
  const bottomPins = template.pins.filter(p => p.y > template.height / 2);

  return (
    <div className="bg-[#0b3d33] border-2 border-[#166355] rounded-xl p-4 shadow-2xl relative select-none w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#166355] opacity-50 tracking-[0.3em]">VOLTFORGE UNO</div>
      
      {/* Visual Component: USB Port */}
      <div className="absolute -left-2 top-10 w-12 h-16 bg-[#b0b0b0] border-y-2 border-r-2 border-[#808080] rounded-r-md shadow-lg" />
      
      {/* Visual Component: Power Jack */}
      <div className="absolute -left-2 bottom-10 w-14 h-18 bg-[#1a1a1a] rounded-r-md shadow-lg" />

      {/* Chips */}
      <div className="mt-20 flex flex-col items-center gap-6">
        <div className="w-20 h-24 bg-[#124d42] border-2 border-[#166355] rounded-lg flex items-center justify-center relative shadow-inner">
          <Cpu size={48} className="text-[#0b3d33] opacity-40" />
          <div className="absolute bottom-2 text-[6px] text-white/20 font-mono">ATMEGA328P</div>
        </div>
      </div>

      {/* Decorative Circuits */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white" />
        <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white" />
      </div>

      {/* Visual Headers */}
      <div className="absolute top-[5px] left-1/2 -translate-x-1/2 flex gap-1.5">
         {/* These are rendered by the main app for interaction, but we add visual flair here */}
      </div>
      
      <div className="absolute top-3 left-[40px] right-[10px] h-6 bg-[#1a1a1a] border border-zinc-800 rounded-sm flex items-center justify-around px-2">
         {topPins.map(p => <div key={p.id} className="w-2.5 h-2.5 bg-[#050505] rounded-sm border border-zinc-700 shadow-inner" />)}
      </div>
      <div className="absolute bottom-3 left-[40px] right-[10px] h-6 bg-[#1a1a1a] border border-zinc-800 rounded-sm flex items-center justify-around px-2">
         {bottomPins.map(p => <div key={p.id} className="w-2.5 h-2.5 bg-[#050505] rounded-sm border border-zinc-700 shadow-inner" />)}
      </div>
    </div>
  );
};

const ESP32Visual = () => {
  const template = COMPONENT_TEMPLATES.ESP32;
  const leftPins = template.pins.filter(p => p.x < template.width / 2);
  const rightPins = template.pins.filter(p => p.x > template.width / 2);

  return (
    <div className="bg-[#1a1a1a] border-2 border-[#333] rounded-md p-2 w-full h-full flex flex-col items-center relative overflow-hidden shadow-2xl">
      <div className="w-full h-12 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t border-b border-zinc-600 flex items-center justify-center mb-4">
        <div className="text-[10px] text-zinc-400 font-bold tracking-widest">ESP32-WROOM</div>
      </div>
      
      <div className="w-14 h-14 bg-zinc-900 border border-zinc-700 rounded-md flex items-center justify-center relative overflow-hidden mb-2">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ccc 0, #ccc 1px, transparent 0, transparent 50%)', backgroundSize: '4px 4px' }} />
        <Cpu size={28} className="text-zinc-700" />
      </div>

      {/* Side Headers */}
      <div className="absolute left-1 top-6 bottom-6 w-3 bg-[#0a0a0a] rounded-sm border border-zinc-800 flex flex-col justify-around py-1">
        {leftPins.map(p => <div key={p.id} className="w-2 h-2 bg-zinc-900 border border-zinc-700 rounded-sm mx-auto" />)}
      </div>
      <div className="absolute right-1 top-6 bottom-6 w-3 bg-[#0a0a0a] rounded-sm border border-zinc-800 flex flex-col justify-around py-1">
        {rightPins.map(p => <div key={p.id} className="w-2 h-2 bg-zinc-900 border border-zinc-700 rounded-sm mx-auto" />)}
      </div>
      
      <div className="absolute top-0 left-4 right-4 h-1.5 bg-[#d4d4d4] rounded-b-md opacity-20" />
    </div>
  );
};

const LEDVisual = ({ active, color = 'red' }: any) => (
  <div className="flex flex-col items-center group relative cursor-pointer w-full h-full">
    {/* LED Body */}
    <div className={`w-full h-[60%] rounded-t-full transition-all duration-150 relative border border-black/20
      ${active ? `bg-${color}-500 shadow-[0_0_25px_${color},0_0_50px_rgba(255,0,0,0.3)]` : `bg-${color}-900/60`}`}>
      <div className="absolute top-2 left-2 w-1.5 h-4 bg-white/20 rounded-full blur-[0.5px]" />
    </div>
    {/* Base Plastic */}
    <div className="w-full h-[10%] bg-[#222] rounded-b-sm border-t border-white/10" />
    {/* Legs */}
    <div className="flex-1 w-full flex justify-around px-2">
      <div className="w-1 h-full bg-zinc-400 shadow-sm" />
      <div className="w-1 h-full bg-zinc-400 shadow-sm" />
    </div>
  </div>
);

const RGBLEDVisual = ({ r, g, b }: any) => (
  <div className="flex flex-col items-center w-full h-full">
    <div 
      className="w-full h-[60%] rounded-t-full border border-black/20 relative"
      style={{ 
        backgroundColor: `rgb(${r ? 255 : 30}, ${g ? 255 : 30}, ${b ? 255 : 30})`,
        boxShadow: (r || g || b) ? `0 0 25px rgb(${r ? 255 : 0}, ${g ? 255 : 0}, ${b ? 255 : 0})` : 'none'
      }}
    >
      <div className="absolute top-2 left-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-md" />
    </div>
    <div className="w-full h-[10%] bg-[#222] rounded-b-sm" />
    <div className="flex-1 w-full flex justify-between px-1">
      {[1,2,3,4].map(i => <div key={i} className="w-1 h-full bg-zinc-400" />)}
    </div>
  </div>
);

const PotVisual = ({ value = 0.5 }: any) => (
  <div className="w-full h-full flex flex-col items-center">
    <div className="w-full aspect-square bg-zinc-800 border-2 border-zinc-700 rounded-full flex items-center justify-center relative shadow-lg">
      <div className="w-4/5 h-4/5 bg-zinc-900 rounded-full border border-zinc-700 flex items-center justify-center transition-transform duration-300" style={{ transform: `rotate(${(value - 0.5) * 270}deg)` }}>
        <div className="w-1.5 h-4 bg-[#00ff9d] rounded-full absolute top-1 shadow-[0_0_8px_#00ff9d]" />
      </div>
    </div>
    <div className="flex-1 w-full flex justify-around px-2 pt-1">
      {[1,2,3].map(i => <div key={i} className="w-1.5 h-full bg-zinc-500 rounded-t-sm" />)}
    </div>
  </div>
);

const ResistorVisual = () => (
  <div className="w-full h-full flex items-center">
    <div className="w-2 h-[2px] bg-zinc-400 flex-shrink-0" />
    <div className="flex-1 h-full bg-[#d8b589] rounded-sm border border-[#b89569] flex items-center justify-around px-1 overflow-hidden">
      <div className="w-2 h-full bg-red-600 shadow-sm" />
      <div className="w-2 h-full bg-orange-600 shadow-sm" />
      <div className="w-2 h-full bg-brown-600 shadow-sm" />
      <div className="ml-2 w-2 h-full bg-yellow-500 shadow-sm" />
    </div>
    <div className="w-2 h-[2px] bg-zinc-400 flex-shrink-0" />
  </div>
);

const BuzzerVisual = ({ active }: any) => (
  <div className="w-full h-full flex flex-col items-center">
    <div className={`w-full aspect-square bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center relative shadow-2xl ${active ? 'animate-pulse scale-105' : ''}`}>
      <div className="w-3/4 h-3/4 border-4 border-zinc-800 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 bg-zinc-700 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-black rounded-full" />
        </div>
      </div>
      {active && <div className="absolute inset-0 border-4 border-[#00ff9d]/30 rounded-full animate-ping" />}
    </div>
    <div className="flex-1 w-full flex justify-around px-4">
      <div className="w-1 h-full bg-zinc-500" />
      <div className="w-1 h-full bg-zinc-500" />
    </div>
  </div>
);

// --- Main Application ---

const App = () => {
  const [project, setProject] = useState<Project>({
    name: "VoltForge Session",
    code: DEFAULT_CODE,
    components: [],
    wires: [],
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPin, setSelectedPin] = useState<{ componentId: string; pinId: string } | null>(null);
  const [pinStates, setPinStates] = useState<Record<string, any>>({});
  const [zoom, setZoom] = useState(1);
  const [hoverPin, setHoverPin] = useState<{ componentId: string; pinId: string } | null>(null);
  
  const simRunningRef = useRef(false);

  // --- Logic ---

  const getPinGlobalPos = useCallback((compId: string, pinId: string) => {
    const comp = project.components.find(c => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    const template = COMPONENT_TEMPLATES[comp.type];
    const pin = template.pins.find(p => p.id === pinId);
    if (!pin) return { x: comp.x, y: comp.y };
    
    // Rotate relative coordinates
    const angle = (comp.rotation * Math.PI) / 180;
    const cx = template.width / 2;
    const cy = template.height / 2;
    
    const dx = pin.x - cx;
    const dy = pin.y - cy;
    
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    
    return { x: comp.x + cx + rx, y: comp.y + cy + ry };
  }, [project.components]);

  const addComponent = (type: ComponentType) => {
    const newComp: ComponentInstance = {
      id: `${type}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      x: 300 + Math.random() * 50,
      y: 200 + Math.random() * 50,
      rotation: 0,
      state: { active: false },
    };
    setProject(p => ({ ...p, components: [...p.components, newComp] }));
  };

  const onPinClick = (componentId: string, pinId: string) => {
    if (!selectedPin) {
      setSelectedPin({ componentId, pinId });
    } else {
      if (selectedPin.componentId === componentId && selectedPin.pinId === pinId) {
        setSelectedPin(null);
        return;
      }
      
      const newWire: Wire = {
        id: `wire_${Math.random().toString(36).substr(2, 7)}`,
        from: selectedPin,
        to: { componentId, pinId },
        color: (pinId.includes('GND') || pinId === 'K') ? '#222' : '#ff4b4b',
      };
      setProject(p => ({ ...p, wires: [...p.wires, newWire] }));
      setSelectedPin(null);
    }
  };

  const startSimulation = async () => {
    setLogs(["[SIM] Initializing Simulation Loop..."]);
    setIsRunning(true);
    simRunningRef.current = true;
    
    const context = {
      HIGH: true, LOW: false, OUTPUT: 'OUTPUT', INPUT: 'INPUT',
      pinMode: (p: any, m: any) => setLogs(l => [...l, `[IO] Config Pin ${p}: ${m}`]),
      digitalWrite: (pin: number | string, val: boolean) => {
        const pinId = String(pin);
        setPinStates(prev => ({ ...prev, [pinId]: val }));
        
        setProject(prev => {
          const updatedComponents = [...prev.components];
          const visited = new Set<string>();
          
          const propagate = (cId: string, pId: string, signal: boolean) => {
            const key = `${cId}:${pId}`;
            if (visited.has(key)) return;
            visited.add(key);

            prev.wires.forEach(w => {
              let target = null;
              if (w.from.componentId === cId && w.from.pinId === pId) target = w.to;
              else if (w.to.componentId === cId && w.to.pinId === pId) target = w.from;

              if (target) {
                const compIndex = updatedComponents.findIndex(c => c.id === target.componentId);
                if (compIndex !== -1) {
                  const comp = updatedComponents[compIndex];
                  if (comp.type === 'LED' && target.pinId === 'A') {
                    updatedComponents[compIndex] = { ...comp, state: { ...comp.state, active: signal } };
                  } else if (comp.type === 'RGB_LED') {
                    updatedComponents[compIndex] = { ...comp, state: { ...comp.state, [target.pinId]: signal } };
                  } else if (comp.type === 'BUZZER' && target.pinId === 'POS') {
                    updatedComponents[compIndex] = { ...comp, state: { ...comp.state, active: signal } };
                  }
                  propagate(target.componentId, target.pinId, signal);
                }
              }
            });
          };

          prev.components.filter(c => c.type === 'ARDUINO' || c.type === 'ESP32').forEach(mcu => {
            propagate(mcu.id, pinId, val);
          });

          return { ...prev, components: updatedComponents };
        });
      },
      delay: (ms: number) => new Promise(res => setTimeout(res, ms)),
      console: { log: (...args: any[]) => setLogs(l => [...l, `[USER] ${args.join(' ')}`]) }
    };

    try {
      const setupBody = project.code.match(/async function setup\(\) \{([\s\S]*?)\}/)?.[1] || "";
      const loopBody = project.code.match(/async function loop\(\) \{([\s\S]*?)\}/)?.[1] || "";
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const setupFn = new AsyncFunction('ctx', `const {pinMode, digitalWrite, delay, console, HIGH, LOW, OUTPUT, INPUT} = ctx; ${setupBody}`);
      const loopFn = new AsyncFunction('ctx', 'isRunning', `const {pinMode, digitalWrite, delay, console, HIGH, LOW, OUTPUT, INPUT} = ctx; while(isRunning.current) { ${loopBody}; await delay(10); }`);
      await setupFn(context);
      loopFn(context, simRunningRef);
    } catch (err: any) {
      setLogs(l => [...l, `[ERR] ${err.message}`]);
      stopSimulation();
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    simRunningRef.current = false;
    setPinStates({});
    setProject(p => ({
      ...p,
      components: p.components.map(c => ({ ...c, state: { ...c.state, active: false, R: false, G: false, B: false } }))
    }));
    setLogs(l => [...l, "[SIM] Terminated."]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#081410] overflow-hidden">
      <header className="h-14 border-b border-[#1a4d3c] bg-[#0f2f24] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-[#00ff9d] font-black tracking-tighter text-2xl italic">
            <Zap size={28} fill="#00ff9d" /> VOLTFORGE
          </div>
          <div className="flex items-center gap-2">
            <IconButton icon={isRunning ? Square : Play} variant="primary" label={isRunning ? "STOP" : "RUN"} onClick={isRunning ? stopSimulation : startSimulation} />
            <IconButton icon={RefreshCw} label="RESTART" onClick={() => window.location.reload()} />
            <IconButton icon={Save} label="EXPORT JSON" onClick={() => console.log(JSON.stringify(project))} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#1a4d3c] px-3 py-1 rounded-full border border-[#00ff9d]/20">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00ff9d] animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[10px] text-[#00ff9d] font-bold">STATUS: {isRunning ? 'EXECUTING' : 'IDLE'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <section className="w-[420px] flex flex-col border-r border-[#1a4d3c] bg-[#0d1a16] shadow-2xl z-40">
          <div className="p-3 bg-[#0f2f24] border-b border-[#1a4d3c] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#7a9e91] uppercase tracking-widest">
              <Activity size={14} /> firmware.ino
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">C++ / JS</div>
          </div>
          <textarea
            value={project.code}
            onChange={(e) => setProject(p => ({ ...p, code: e.target.value }))}
            className="flex-1 bg-transparent p-6 outline-none resize-none text-[#00ff9d] font-mono text-sm leading-relaxed selection:bg-[#00ff9d]/20"
            spellCheck={false}
          />
          <div className="h-56 border-t border-[#1a4d3c] bg-[#081410] overflow-y-auto p-4 font-mono text-[10px]">
            <div className="text-zinc-600 mb-2 uppercase text-[9px] font-black border-b border-zinc-900 pb-1">System Console Output</div>
            {logs.map((log, i) => (
              <div key={i} className={`mb-1 ${log.includes('[ERR]') ? 'text-red-400' : log.includes('[USER]') ? 'text-blue-300' : 'text-[#7a9e91]'}`}>
                <span className="opacity-30 mr-2">{i+1}</span>{log}
              </div>
            ))}
          </div>
        </section>

        {/* Workspace */}
        <section className="flex-1 relative overflow-hidden bg-[#081410]">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(#00ff9d 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `linear-gradient(#1a4d3c 1px, transparent 1px), linear-gradient(90deg, #1a4d3c 1px, transparent 1px)`, backgroundSize: '160px 160px' }} />
          
          <div className="absolute bottom-6 left-6 z-20 flex gap-2">
            <div className="bg-[#0f2f24]/90 backdrop-blur-md border border-[#1a4d3c] p-1 rounded-xl flex gap-1 shadow-2xl">
              <IconButton icon={Grid} onClick={() => setZoom(z => z === 1 ? 1.5 : 1)} />
              <IconButton icon={Trash2} variant="danger" label="CLEAR ALL" onClick={() => setProject(p => ({ ...p, components: [], wires: [] }))} />
            </div>
          </div>

          <div className="w-full h-full relative origin-top-left overflow-auto p-[1000px]" style={{ transform: `scale(${zoom})` }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {project.wires.map(wire => {
                const start = getPinGlobalPos(wire.from.componentId, wire.from.pinId);
                const end = getPinGlobalPos(wire.to.componentId, wire.to.pinId);
                const isActive = pinStates[wire.from.pinId] || pinStates[wire.to.pinId];
                return (
                  <path
                    key={wire.id}
                    d={`M ${start.x} ${start.y} C ${start.x} ${end.y + 20}, ${end.x} ${start.y - 20}, ${end.x} ${end.y}`}
                    stroke={isActive ? '#00ff9d' : wire.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer pointer-events-auto hover:stroke-[#00ff9d] hover:stroke-4"
                    onClick={(e) => {
                       e.stopPropagation();
                       setProject(p => ({ ...p, wires: p.wires.filter(w => w.id !== wire.id) }));
                    }}
                    style={{ filter: isActive ? 'drop-shadow(0 0 8px #00ff9d)' : 'none' }}
                  />
                );
              })}
            </svg>

            {project.components.map(comp => (
              <motion.div
                key={comp.id}
                drag
                dragMomentum={false}
                onDrag={(e, info) => {
                  setProject(p => ({
                    ...p,
                    components: p.components.map(c => c.id === comp.id ? { ...c, x: c.x + info.delta.x, y: c.y + info.delta.y } : c)
                  }));
                }}
                className="absolute cursor-grab active:cursor-grabbing group/comp"
                style={{ left: comp.x, top: comp.y, width: COMPONENT_TEMPLATES[comp.type].width, height: COMPONENT_TEMPLATES[comp.type].height }}
              >
                <div className="relative w-full h-full" style={{ transform: `rotate(${comp.rotation}deg)` }}>
                  {/* Visual Renderers */}
                  {comp.type === 'ARDUINO' && <ArduinoVisual />}
                  {comp.type === 'ESP32' && <ESP32Visual />}
                  {comp.type === 'LED' && <LEDVisual active={comp.state.active} />}
                  {comp.type === 'RGB_LED' && <RGBLEDVisual r={comp.state.R} g={comp.state.G} b={comp.state.B} />}
                  {comp.type === 'POTENTIOMETER' && <PotVisual value={comp.state.potValue} />}
                  {comp.type === 'BUZZER' && <BuzzerVisual active={comp.state.active} />}
                  {comp.type === 'RESISTOR' && <ResistorVisual />}
                  {comp.type === 'PHOTO_RESISTOR' && (
                    <div className="w-full h-full bg-[#cc8866] border border-[#aa6644] rounded-md flex flex-col items-center justify-center p-1 shadow-md">
                      <div className="w-full h-full border border-red-900/20 rounded relative">
                         <div className="absolute inset-x-1 top-2 bottom-2 bg-red-600/30 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #8b0000 2px, #8b0000 4px)' }} />
                      </div>
                    </div>
                  )}
                  {comp.type === 'BUTTON' && (
                    <div className="w-full h-full bg-[#222] border-2 border-zinc-700 rounded-lg shadow-xl flex items-center justify-center relative">
                       <div className="w-10 h-10 bg-zinc-800 rounded-full border border-black shadow-inner flex items-center justify-center">
                          <div className="w-6 h-6 bg-zinc-900 rounded-full" />
                       </div>
                       {/* Terminal legs */}
                       <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-zinc-500 rounded-sm" />
                       <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-zinc-500 rounded-sm" />
                    </div>
                  )}

                  {/* Component Label */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap bg-zinc-900/50 px-1 rounded">
                    {comp.id}
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover/comp:flex gap-1 bg-[#0f2f24] border border-[#1a4d3c] p-1.5 rounded-lg z-[100] shadow-2xl">
                    <button onClick={() => setProject(p => ({ ...p, components: p.components.map(c => c.id === comp.id ? { ...c, rotation: (c.rotation + 90) % 360 } : c) }))} className="p-1 hover:bg-[#1a4d3c] rounded text-[#00ff9d]"><RotateCw size={14} /></button>
                    <button onClick={() => setProject(p => ({ ...p, components: p.components.filter(c => c.id !== comp.id), wires: p.wires.filter(w => w.from.componentId !== comp.id && w.to.componentId !== comp.id) }))} className="p-1 hover:bg-red-900/30 rounded text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Pin Connection Points - Precise Hitboxes */}
                {COMPONENT_TEMPLATES[comp.type].pins.map(pin => {
                  const pos = getPinGlobalPos(comp.id, pin.id);
                  const isSelected = selectedPin?.componentId === comp.id && selectedPin?.pinId === pin.id;
                  const isHovered = hoverPin?.componentId === comp.id && hoverPin?.pinId === pin.id;
                  
                  return (
                    <div
                      key={pin.id}
                      onMouseEnter={() => setHoverPin({ componentId: comp.id, pinId: pin.id })}
                      onMouseLeave={() => setHoverPin(null)}
                      onClick={(e) => { e.stopPropagation(); onPinClick(comp.id, pin.id); }}
                      className={`absolute w-5 h-5 rounded-full cursor-crosshair z-[60] flex items-center justify-center transition-all
                        ${isSelected ? 'bg-[#00ff9d] scale-150 shadow-[0_0_15px_#00ff9d]' : isHovered ? 'bg-[#1a4d3c] border border-[#00ff9d] scale-110' : 'bg-transparent'}`}
                      style={{ 
                        left: (pos.x - comp.x) - 10, 
                        top: (pos.y - comp.y) - 10 
                      }}
                    >
                      {/* Visual marker only when hovered or selected */}
                      {(isHovered || isSelected) && (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      )}
                      {isHovered && (
                        <div className="absolute top-6 left-6 bg-[#081410] border border-[#00ff9d] px-2 py-1 rounded text-[9px] text-[#00ff9d] font-black whitespace-nowrap z-[100] shadow-2xl">
                          {pin.name} ({pin.type.toUpperCase()})
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Component Drawer */}
        <aside className="w-64 bg-[#0f2f24] border-l border-[#1a4d3c] flex flex-col z-40">
          <div className="p-4 border-b border-[#1a4d3c] flex items-center gap-2 text-[#00ff9d] font-bold text-xs uppercase tracking-widest">
            <Layers size={14} /> Toolbox
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {[
              { cat: 'Microcontrollers', items: ['ARDUINO', 'ESP32'] },
              { cat: 'Visual Feedback', items: ['LED', 'RGB_LED', 'BUZZER'] },
              { cat: 'Passive Components', items: ['RESISTOR', 'POTENTIOMETER', 'PHOTO_RESISTOR'] },
              { cat: 'Input & Control', items: ['BUTTON'] },
            ].map(g => (
              <div key={g.cat}>
                <div className="text-[9px] text-[#5a7a6e] font-black uppercase mb-3 tracking-widest">{g.cat}</div>
                <div className="grid grid-cols-2 gap-3">
                  {g.items.map(type => (
                    <button
                      key={type}
                      onClick={() => addComponent(type as ComponentType)}
                      className="p-3 bg-[#081410] border border-[#1a4d3c] rounded-xl hover:border-[#00ff9d] hover:bg-[#1a4d3c] flex flex-col items-center gap-3 group transition-all duration-300 active:scale-95 shadow-lg"
                    >
                      <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-[#081410] transition-colors">
                        {type === 'LED' ? <Lightbulb size={24} className="text-[#3a5a4e] group-hover:text-[#00ff9d]" /> : 
                         type === 'BUZZER' ? <Volume2 size={24} className="text-[#3a5a4e] group-hover:text-[#00ff9d]" /> :
                         type === 'PHOTO_RESISTOR' ? <Sun size={24} className="text-[#3a5a4e] group-hover:text-[#00ff9d]" /> :
                         type === 'POTENTIOMETER' ? <RotateCw size={24} className="text-[#3a5a4e] group-hover:text-[#00ff9d]" /> :
                         <Cpu size={24} className="text-[#3a5a4e] group-hover:text-[#00ff9d]" />}
                      </div>
                      <span className="text-[9px] font-bold text-[#5a7a6e] group-hover:text-white uppercase truncate w-full text-center">{type.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-[#081410] border-t border-[#1a4d3c]">
             <div className="text-[10px] text-zinc-500 font-bold mb-2 uppercase">Workbench Tip:</div>
             <p className="text-[9px] text-[#7a9e91] leading-relaxed italic">
               Drag components to move. Click on pins to start a wire connection. Click a wire to delete it.
             </p>
          </div>
        </aside>
      </div>

      <footer className="h-7 bg-[#081410] border-t border-[#1a4d3c] flex items-center justify-between px-6 text-[10px] font-bold text-[#3a5a4e] uppercase tracking-wider">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1"><Cpu size={12} /> ENGINE: NANO-CORE</div>
          <div className="flex items-center gap-1 text-[#00ff9d]"><Zap size={12} /> POWER: STABLE</div>
        </div>
        <div>BUILD 0.8.4-BETA // {project.components.length} NODES ACTIVE</div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);