// components/admin/admin-map-editor.tsx
'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  MapPin,
  Square,
  Pentagon,
  Footprints,
  Shield,
  Droplets,
  DoorClosed,
  Columns3,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Eye,
  ArrowLeft,
  Settings2,
  Grid,
  Info
} from 'lucide-react';
import {
  MAP_COLLISION_PROFILES,
  isPointInsidePolygon,
  isPointWalkableWithPolygons,
  isGridTileWalkable,
  findPathWithCustomPolygons,
  type CollisionPolygon,
  type MapZoneType,
  type Point
} from '@/lib/collision-system';

export interface EditorZone extends CollisionPolygon {
  // Can store additional editor metadata if desired
  visible?: boolean;
}

const ZONE_TYPE_CONFIG: Record<
  MapZoneType,
  { label: string; color: string; stroke: string; fill: string; icon: string; description: string }
> = {
  bloqueado: {
    label: 'Bloqueado (Parede/Obstáculo)',
    color: 'text-red-400',
    stroke: '#ef4444',
    fill: 'rgba(239, 68, 68, 0.35)',
    icon: 'Shield',
    description: 'Impede passagem total do token'
  },
  obstacle: {
    label: 'Obstáculo',
    color: 'text-red-400',
    stroke: '#ef4444',
    fill: 'rgba(239, 68, 68, 0.35)',
    icon: 'Shield',
    description: 'Obstáculo intransponível'
  },
  agua: {
    label: 'Água Profunda',
    color: 'text-sky-400',
    stroke: '#0ea5e9',
    fill: 'rgba(14, 165, 233, 0.35)',
    icon: 'Droplets',
    description: 'Impede caminhada, exceto onde houver ponte'
  },
  water: {
    label: 'Água',
    color: 'text-sky-400',
    stroke: '#0ea5e9',
    fill: 'rgba(14, 165, 233, 0.35)',
    icon: 'Droplets',
    description: 'Massa d\'água'
  },
  caminhavel: {
    label: 'Caminhável (Passagem)',
    color: 'text-emerald-400',
    stroke: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.25)',
    icon: 'Footprints',
    description: 'Área desobstruída para trânsito'
  },
  walkable: {
    label: 'Caminhável',
    color: 'text-emerald-400',
    stroke: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.25)',
    icon: 'Footprints',
    description: 'Área desobstruída'
  },
  porta: {
    label: 'Porta',
    color: 'text-amber-400',
    stroke: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.4)',
    icon: 'DoorClosed',
    description: 'Ponto de passagem ou bloqueio de entrada'
  },
  ponte: {
    label: 'Ponte (Sobrescrita)',
    color: 'text-cyan-300',
    stroke: '#06b6d4',
    fill: 'rgba(6, 182, 212, 0.4)',
    icon: 'Columns3',
    description: 'Permite transitar sobre água ou fendas'
  },
  difficult: {
    label: 'Terreno Difícil',
    color: 'text-yellow-400',
    stroke: '#eab308',
    fill: 'rgba(234, 179, 8, 0.25)',
    icon: 'Footprints',
    description: 'Custo dobrado de movimento'
  }
};

const PRESET_MAPS = [
  { id: 'village', name: 'Vila do Rio Verde', imageSrc: '/maps/vila.png' },
  { id: 'forest', name: 'Floresta dos Sussurros', imageSrc: '/maps/mata.png' },
  { id: 'dungeon', name: 'Catacumbas dos Três Selos', imageSrc: '/maps/dungeon.png' }
];

export function AdminMapEditor() {
  // Active map background
  const [selectedPreset, setSelectedPreset] = useState<string>('village');
  const [mapImageSrc, setMapImageSrc] = useState<string>('/maps/vila.png');
  const [customUrl, setCustomUrl] = useState('');

  // Grid setup (exact scale as game)
  const [gridSize, setGridSize] = useState<number>(8);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);

  // Polygons list
  const [polygons, setPolygons] = useState<EditorZone[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lume_map_zones_village');
        if (stored) {
          const parsed = JSON.parse(stored);
          const zones = Array.isArray(parsed) ? parsed : parsed.zones;
          if (zones && zones.length > 0) return zones;
        }
      } catch {}
    }
    const p = MAP_COLLISION_PROFILES.village;
    if (p.customZones && p.customZones.length > 0) {
      return p.customZones;
    }
    const obstacles: EditorZone[] = p.obstacles.map((o) => ({ ...o, type: o.type === 'water' ? 'agua' : 'bloqueado' }));
    const bridges: EditorZone[] = (p.walkableBridges || []).map((b) => ({ ...b, type: 'ponte' }));
    return [...obstacles, ...bridges];
  });

  // Current drawing tool
  const [tool, setTool] = useState<'select' | 'rectangle' | 'polygon' | 'test'>('polygon');
  const [activeZoneType, setActiveZoneType] = useState<MapZoneType>('bloqueado');

  // Polygon in progress
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [rectStart, setRectStart] = useState<[number, number] | null>(null);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);

  // Selected polygon for inspection
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);

  // Test Mode State
  const [testTokenPos, setTestTokenPos] = useState<Point>({ x: 4, y: 4 });
  const [hoveredTile, setHoveredTile] = useState<Point | null>(null);
  const [isTokenWalking, setIsTokenWalking] = useState<boolean>(false);

  // JSON modal / feedback
  const [jsonText, setJsonText] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync collision profile from API on preset change
  useEffect(() => {
    fetch(`/api/map-collision?biome=${selectedPreset}`)
      .then((r) => r.json())
      .then((d: any) => {
        if (d?.zones && Array.isArray(d.zones)) {
          setPolygons(d.zones);
        }
        if (d?.gridSize) {
          setGridSize(Number(d.gridSize));
        }
      })
      .catch(() => {});
  }, [selectedPreset]);

  // Load preset map polygons
  const handleLoadPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const map = PRESET_MAPS.find((m) => m.id === presetId);
    if (map) setMapImageSrc(map.imageSrc);
    setSelectedPolygonId(null);
    setCurrentPoints([]);
    setRectStart(null);

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`lume_map_zones_${presetId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const zones = Array.isArray(parsed) ? parsed : parsed.zones;
          if (zones && Array.isArray(zones)) {
            setPolygons(zones);
            if (parsed.gridSize) setGridSize(Number(parsed.gridSize));
            return;
          }
        }
      } catch {}
    }

    const profileKey = presetId as 'village' | 'forest' | 'dungeon';
    const p = MAP_COLLISION_PROFILES[profileKey];
    if (p) {
      if (p.customZones !== undefined) {
        setPolygons(p.customZones);
      } else {
        const obstacles: EditorZone[] = p.obstacles.map((o) => ({
          ...o,
          type: o.type === 'water' ? 'agua' : 'bloqueado'
        }));
        const bridges: EditorZone[] = (p.walkableBridges || []).map((b) => ({
          ...b,
          type: 'ponte'
        }));
        setPolygons([...obstacles, ...bridges]);
      }
      if (p.gridSize) setGridSize(p.gridSize);
    }
  };

  // Upload local image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMapImageSrc(reader.result);
        setSelectedPreset('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  // Convert client coordinate into normalized coordinate [0..1]
  const getNormalizedCoords = (e: React.MouseEvent<SVGSVGElement>): [number, number] => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    // Clamp
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    if (snapToGrid) {
      x = Math.round(x * gridSize) / gridSize;
      y = Math.round(y * gridSize) / gridSize;
    }

    return [Number(x.toFixed(4)), Number(y.toFixed(4))];
  };

  // Mouse Move on SVG
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getNormalizedCoords(e);
    setMousePos(coords);

    if (tool === 'test') {
      const gx = Math.floor(coords[0] * gridSize);
      const gy = Math.floor(coords[1] * gridSize);
      if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
        setHoveredTile({ x: gx, y: gy });
      }
    }
  };

  // SVG Click Handler
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const [nx, ny] = getNormalizedCoords(e);

    // MODE: TEST
    if (tool === 'test') {
      const gx = Math.floor(nx * gridSize);
      const gy = Math.floor(ny * gridSize);
      if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
        handleMoveTestToken({ x: gx, y: gy });
      }
      return;
    }

    // MODE: RECTANGLE
    if (tool === 'rectangle') {
      if (!rectStart) {
        setRectStart([nx, ny]);
      } else {
        const [x1, y1] = rectStart;
        const xMin = Math.min(x1, nx);
        const xMax = Math.max(x1, nx);
        const yMin = Math.min(y1, ny);
        const yMax = Math.max(y1, ny);

        if (xMax - xMin > 0.01 && yMax - yMin > 0.01) {
          const newRect: EditorZone = {
            id: `zone-${Date.now()}`,
            name: `${ZONE_TYPE_CONFIG[activeZoneType].label} ${polygons.length + 1}`,
            type: activeZoneType,
            points: [
              [xMin, yMin],
              [xMax, yMin],
              [xMax, yMax],
              [xMin, yMax]
            ]
          };
          setPolygons((prev) => [...prev, newRect]);
          setSelectedPolygonId(newRect.id);
        }
        setRectStart(null);
      }
      return;
    }

    // MODE: POLYGON
    if (tool === 'polygon') {
      setCurrentPoints((prev) => [...prev, [nx, ny]]);
    }
  };

  // Close / Complete current polygon
  const handleFinishPolygon = () => {
    if (currentPoints.length < 3) return;
    const newPoly: EditorZone = {
      id: `zone-${Date.now()}`,
      name: `${ZONE_TYPE_CONFIG[activeZoneType].label} ${polygons.length + 1}`,
      type: activeZoneType,
      points: currentPoints
    };
    setPolygons((prev) => [...prev, newPoly]);
    setSelectedPolygonId(newPoly.id);
    setCurrentPoints([]);
  };

  const handleCancelDrawing = () => {
    setCurrentPoints([]);
    setRectStart(null);
  };

  const handleDeletePolygon = (id: string) => {
    setPolygons((prev) => prev.filter((p) => p.id !== id));
    if (selectedPolygonId === id) setSelectedPolygonId(null);
  };

  // TEST MODE: calculate active path
  const testPath = useMemo(() => {
    if (tool !== 'test' || !hoveredTile) return [];
    return findPathWithCustomPolygons(testTokenPos, hoveredTile, polygons, gridSize);
  }, [tool, testTokenPos, hoveredTile, polygons, gridSize]);

  const isHoveredTileWalkable = useMemo(() => {
    if (tool !== 'test' || !hoveredTile) return true;
    return isGridTileWalkable('village', hoveredTile.x, hoveredTile.y, gridSize, polygons);
  }, [tool, hoveredTile, polygons, gridSize]);

  // Execute token walk along path
  const handleMoveTestToken = (destination: Point) => {
    if (isTokenWalking) return;
    const path = findPathWithCustomPolygons(testTokenPos, destination, polygons, gridSize);
    if (path.length <= 1) return;

    setIsTokenWalking(true);
    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < path.length) {
        setTestTokenPos(path[stepIndex]);
      } else {
        clearInterval(interval);
        setIsTokenWalking(false);
      }
    }, 120);
  };

  // Save to game directly and persist to API + localStorage
  const handleSaveToGame = async (overrideZones?: EditorZone[], overrideGrid?: number) => {
    const zonesToSave = overrideZones || polygons;
    const gridToSave = overrideGrid || gridSize;
    const currentBiome = selectedPreset || 'village';

    const exportData = {
      version: 1,
      gridSize: gridToSave,
      imageSrc: mapImageSrc,
      biome: currentBiome,
      zones: zonesToSave
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`lume_map_zones_${currentBiome}`, JSON.stringify(exportData));
      window.dispatchEvent(new CustomEvent('lume-map-updated', { detail: exportData }));
    }

    try {
      const res = await fetch('/api/map-collision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });
      const data = (await res.json()) as any;
      if (data?.success) {
        setSaveStatus(`✅ ${zonesToSave.length} zonas salvas e ativas no jogo!`);
      } else {
        setSaveStatus(`⚠️ Salvo no navegador (${zonesToSave.length} zonas)`);
      }
    } catch {
      setSaveStatus(`⚠️ Salvo no navegador (${zonesToSave.length} zonas)`);
    }

    setTimeout(() => setSaveStatus(null), 4000);
  };

  // JSON Export / Import
  const handleExportJson = () => {
    const exportData = {
      version: 1,
      gridSize,
      imageSrc: mapImageSrc,
      zones: polygons
    };
    const str = JSON.stringify(exportData, null, 2);
    setJsonText(str);
    setShowJsonModal(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonText || JSON.stringify(polygons, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapa-colisao-${selectedPreset || 'custom'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      let newZones: EditorZone[] = [];
      let newGrid = gridSize;
      if (Array.isArray(parsed)) {
        newZones = parsed;
        setPolygons(parsed);
      } else if (parsed.zones && Array.isArray(parsed.zones)) {
        newZones = parsed.zones;
        setPolygons(parsed.zones);
        if (parsed.gridSize) {
          setGridSize(parsed.gridSize);
          newGrid = parsed.gridSize;
        }
        if (parsed.imageSrc) setMapImageSrc(parsed.imageSrc);
      }
      setShowJsonModal(false);
      handleSaveToGame(newZones, newGrid);
    } catch {
      alert('JSON inválido. Certifique-se do formato correto.');
    }
  };

  const selectedZone = polygons.find((p) => p.id === selectedPolygonId);

  return (
    <div className="flex flex-col h-screen w-full bg-[#080c10] text-[#e2e8f0] select-none font-sans overflow-hidden">
      {/* ═══ TOP NAVBAR ═══ */}
      <header className="h-14 border-b border-zinc-800 bg-[#0e131b] px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-amber-300 bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Jogo</span>
          </a>
          <div className="h-4 w-px bg-zinc-700 mx-1" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-serif font-black tracking-wide text-amber-200 text-sm md:text-base">
              EDITOR DE MAPAS TÁTICOS <span className="text-zinc-400 font-mono text-xs font-normal">LUME 5e</span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-xs font-bold text-emerald-300 animate-fade-in bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
              {saveStatus}
            </span>
          )}
          <button
            onClick={() => handleSaveToGame()}
            className="flex items-center gap-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 px-3 py-1.5 rounded-lg transition-all shadow-md shadow-emerald-950/60 cursor-pointer active:scale-95"
            title="Salvar e ativar este mapa de colisões imediatamente no jogo"
          >
            <Check size={14} className="text-white" />
            <span>Salvar no Jogo</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Exportar dados JSON"
          >
            <Download size={13} className="text-amber-400" />
            <span>Exportar JSON</span>
          </button>
          <button
            onClick={() => {
              setJsonText('');
              setShowJsonModal(true);
            }}
            className="flex items-center gap-1 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Importar dados JSON"
          >
            <Upload size={13} className="text-sky-400" />
            <span>Importar</span>
          </button>
        </div>
      </header>

      {/* ═══ MAIN WORKSPACE ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── LEFT TOOLBAR & CONFIG ─── */}
        <aside className="w-72 border-r border-zinc-800 bg-[#0c1017] p-3 flex flex-col gap-4 shrink-0 overflow-y-auto z-20">
          {/* Map Image Selection */}
          <div className="flex flex-col gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5">
            <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <MapPin size={12} />
              <span>Imagem do Mapa</span>
            </label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {PRESET_MAPS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleLoadPreset(m.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer truncate ${
                    selectedPreset === m.id
                      ? 'bg-amber-500/20 border-amber-500/70 text-amber-200'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={m.name}
                >
                  {m.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Custom file or URL input */}
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="URL da imagem..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => {
                  if (customUrl) {
                    setMapImageSrc(customUrl);
                    setSelectedPreset('custom');
                  }
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] rounded-lg cursor-pointer shrink-0"
              >
                Aplicar
              </button>
            </div>

            <div className="mt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-center py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg border border-zinc-700 cursor-pointer"
              >
                📁 Carregar Arquivo do PC
              </button>
            </div>
          </div>

          {/* Grid Scale & Snapping (Matches Tactical Map) */}
          <div className="flex flex-col gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Grid size={12} />
                <span>Grade Tática (Escala)</span>
              </label>
              <span className="font-mono text-[10px] text-zinc-400">{gridSize}x{gridSize}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {[8, 12, 16].map((size) => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    gridSize === size
                      ? 'bg-amber-500/20 border-amber-500/70 text-amber-200'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-800">
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 cursor-pointer"
                />
                <span>Magnetismo (Snap)</span>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGridLines}
                  onChange={(e) => setShowGridLines(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 cursor-pointer"
                />
                <span>Ver Grade</span>
              </label>
            </div>
          </div>

          {/* Mode Selector: Desenhar vs Teste */}
          <div className="flex flex-col gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5">
            <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Modo de Operação
            </label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <button
                onClick={() => {
                  setTool('polygon');
                  handleCancelDrawing();
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  tool === 'polygon'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <Pentagon size={13} />
                <span>Polígono</span>
              </button>
              <button
                onClick={() => {
                  setTool('rectangle');
                  handleCancelDrawing();
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  tool === 'rectangle'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <Square size={13} />
                <span>Retângulo</span>
              </button>
            </div>

            {/* Test Mode Button */}
            <button
              onClick={() => {
                setTool(tool === 'test' ? 'polygon' : 'test');
                handleCancelDrawing();
              }}
              className={`mt-1.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black border uppercase tracking-wider transition-all cursor-pointer ${
                tool === 'test'
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse'
                  : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/70'
              }`}
            >
              <Footprints size={15} />
              <span>{tool === 'test' ? 'Sair do Modo Teste' : '▶ Modo Teste (Pathfinding)'}</span>
            </button>
          </div>

          {/* Terrain / Zone Type Picker */}
          {tool !== 'test' && (
            <div className="flex flex-col gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5">
              <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Tipo de Região / Terreno
              </label>
              <div className="flex flex-col gap-1 mt-1">
                {(['bloqueado', 'agua', 'caminhavel', 'porta', 'ponte'] as MapZoneType[]).map((type) => {
                  const cfg = ZONE_TYPE_CONFIG[type];
                  const isSelected = activeZoneType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveZoneType(type)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400/80 bg-zinc-800 text-white shadow-sm'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/40 shrink-0"
                          style={{ backgroundColor: cfg.stroke }}
                        />
                        <span className={isSelected ? 'text-zinc-100 font-bold' : ''}>
                          {type === 'bloqueado' ? 'Bloqueado' : type === 'agua' ? 'Água' : type === 'caminhavel' ? 'Caminhável' : type === 'porta' ? 'Porta' : 'Ponte'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {type === 'ponte' ? 'sobrescreve' : type === 'agua' || type === 'bloqueado' ? 'bloqueia' : 'livre'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Drawing Controls */}
          {tool === 'polygon' && currentPoints.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-amber-950/40 border border-amber-500/60 rounded-xl p-2.5 animate-fade-in">
              <span className="text-[11px] font-bold text-amber-300">
                Polígono: {currentPoints.length} vértice{currentPoints.length > 1 ? 's' : ''}
              </span>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  onClick={handleFinishPolygon}
                  disabled={currentPoints.length < 3}
                  className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-black font-bold text-xs rounded-lg cursor-pointer"
                >
                  Concluir
                </button>
                <button
                  onClick={handleCancelDrawing}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {tool === 'rectangle' && rectStart && (
            <div className="flex flex-col gap-1.5 bg-amber-950/40 border border-amber-500/60 rounded-xl p-2.5 animate-fade-in">
              <span className="text-[11px] font-bold text-amber-300">
                Retângulo: Clique no 2º ponto
              </span>
              <button
                onClick={handleCancelDrawing}
                className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Test Mode Helper Information */}
          {tool === 'test' && (
            <div className="flex flex-col gap-1.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-2.5">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                <Info size={13} />
                <span>Simulação 5e Ativa</span>
              </span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Clique em qualquer quadrado para guiar o token de teste. O token utiliza o mesmo algoritmo A* e Ray-Casting do jogo e <strong>não atravessará obstáculos ou água</strong>.
              </p>
              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded">
                <span>Token: X:{testTokenPos.x} Y:{testTokenPos.y}</span>
                <button
                  onClick={() => setTestTokenPos({ x: 4, y: 4 })}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Resetar
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* ─── CENTER MAP CANVAS ─── */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 bg-[#05080c] relative overflow-hidden">
          {/* Status HUD top-bar */}
          <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="bg-zinc-950/90 border border-zinc-800 px-3 py-1 rounded-full text-xs font-mono text-zinc-300 backdrop-blur pointer-events-auto flex items-center gap-3 shadow-lg">
              {mousePos && (
                <span>
                  Normalizado: <strong className="text-amber-300">{mousePos[0].toFixed(3)}, {mousePos[1].toFixed(3)}</strong>
                </span>
              )}
              {hoveredTile && (
                <span className="border-l border-zinc-700 pl-3">
                  Grid: <strong className="text-zinc-200">X:{hoveredTile.x} Y:{hoveredTile.y}</strong>
                </span>
              )}
              {tool === 'test' && hoveredTile && (
                <span className="border-l border-zinc-700 pl-3 font-bold">
                  {testPath.length > 1 ? (
                    <span className="text-emerald-400">Rota livre: {testPath.length - 1} passos ({((testPath.length - 1) * 1.5).toFixed(1)}m)</span>
                  ) : !isHoveredTileWalkable ? (
                    <span className="text-red-400">Intransponível (Obstáculo)</span>
                  ) : (
                    <span className="text-zinc-400">Mesmo local</span>
                  )}
                </span>
              )}
            </div>

            <div className="bg-zinc-950/90 border border-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-zinc-400 backdrop-blur pointer-events-auto flex items-center gap-2 shadow-lg">
              <span>{polygons.length} regiões salvas</span>
            </div>
          </div>

          {/* Dynamic 16:9 Aspect Ratio Game Board Container (Matches Natural 1672x941 Map Image Resolution) */}
          <div
            ref={containerRef}
            className="relative w-full max-w-5xl aspect-[16/9] rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-black select-none"
          >
            {/* 1. Map Image */}
            <img
              src={mapImageSrc}
              alt="Mapa Administrativo"
              className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
            />

            {/* 2. Grid Overlay */}
            {showGridLines && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize}, 1fr)`
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-white/10"
                  />
                ))}
              </div>
            )}

            {/* 3. Interactive SVG Layer */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              style={{ overflow: 'visible' }}
              onClick={handleSvgClick}
              onMouseMove={handleSvgMouseMove}
            >
              {/* Saved Polygons */}
              {polygons.map((poly) => {
                const cfg = ZONE_TYPE_CONFIG[poly.type] || ZONE_TYPE_CONFIG.bloqueado;
                const pointsStr = poly.points.map(([px, py]) => `${px * 100},${py * 100}`).join(' ');
                const isSelected = selectedPolygonId === poly.id;

                // Compute center point for label
                const avgX = (poly.points.reduce((acc, p) => acc + p[0], 0) / poly.points.length) * 100;
                const avgY = (poly.points.reduce((acc, p) => acc + p[1], 0) / poly.points.length) * 100;

                return (
                  <g key={poly.id} onClick={(e) => {
                    e.stopPropagation();
                    if (tool !== 'test') setSelectedPolygonId(poly.id);
                  }}>
                    <polygon
                      points={pointsStr}
                      fill={cfg.fill}
                      stroke={isSelected ? '#ffffff' : cfg.stroke}
                      strokeWidth={isSelected ? 1.2 : 0.7}
                      strokeDasharray={poly.type === 'porta' ? '2 1' : undefined}
                      className="transition-all hover:opacity-90 cursor-pointer"
                    />
                    {/* Center label */}
                    <text
                      x={avgX}
                      y={avgY}
                      fill="#ffffff"
                      fontSize="2.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    >
                      {poly.name.length > 14 ? poly.name.slice(0, 12) + '...' : poly.name}
                    </text>
                  </g>
                );
              })}

              {/* In-Progress Polygon Preview */}
              {tool === 'polygon' && currentPoints.length > 0 && (
                <g>
                  {/* Points placed */}
                  {currentPoints.map(([px, py], i) => (
                    <circle
                      key={i}
                      cx={px * 100}
                      cy={py * 100}
                      r="1.2"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="0.4"
                    />
                  ))}
                  {/* Polyline */}
                  <polyline
                    points={currentPoints.map(([px, py]) => `${px * 100},${py * 100}`).join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.8"
                    strokeDasharray="2 1"
                  />
                  {/* Guide line to mouse */}
                  {mousePos && (
                    <line
                      x1={currentPoints[currentPoints.length - 1][0] * 100}
                      y1={currentPoints[currentPoints.length - 1][1] * 100}
                      x2={mousePos[0] * 100}
                      y2={mousePos[1] * 100}
                      stroke="#fbbf24"
                      strokeWidth="0.6"
                      strokeDasharray="1 1"
                    />
                  )}
                </g>
              )}

              {/* In-Progress Rectangle Preview */}
              {tool === 'rectangle' && rectStart && mousePos && (
                <rect
                  x={Math.min(rectStart[0], mousePos[0]) * 100}
                  y={Math.min(rectStart[1], mousePos[1]) * 100}
                  width={Math.abs(mousePos[0] - rectStart[0]) * 100}
                  height={Math.abs(mousePos[1] - rectStart[1]) * 100}
                  fill={ZONE_TYPE_CONFIG[activeZoneType].fill}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  strokeDasharray="2 1"
                />
              )}

              {/* ─── TEST MODE PATH & WAYPOINTS ─── */}
              {tool === 'test' && testPath.length > 1 && (
                <g>
                  <polyline
                    points={testPath.map((p) => `${((p.x + 0.5) / gridSize) * 100},${((p.y + 0.5) / gridSize) * 100}`).join(' ')}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.2"
                    strokeDasharray="2 1"
                  />
                  {testPath.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={((p.x + 0.5) / gridSize) * 100}
                      cy={((p.y + 0.5) / gridSize) * 100}
                      r={idx === testPath.length - 1 ? 1.8 : 0.9}
                      fill={idx === testPath.length - 1 ? '#10b981' : '#6ee7b7'}
                    />
                  ))}
                </g>
              )}

              {/* ─── TEST MODE TOKEN ─── */}
              {tool === 'test' && (
                <g
                  transform={`translate(${((testTokenPos.x + 0.5) / gridSize) * 100}, ${((testTokenPos.y + 0.5) / gridSize) * 100})`}
                  className="transition-transform duration-100"
                >
                  <circle r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
                  <text
                    y="1.2"
                    textAnchor="middle"
                    fontSize="3"
                    fontWeight="bold"
                    fill="#000000"
                  >
                    HERÓI
                  </text>
                </g>
              )}
            </svg>
          </div>
        </main>

        {/* ─── RIGHT SIDEBAR: ZONES INSPECTOR ─── */}
        <aside className="w-80 border-l border-zinc-800 bg-[#0c1017] p-3 flex flex-col gap-3 shrink-0 overflow-y-auto z-20">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Regiões Cadastradas ({polygons.length})
            </h2>
            {polygons.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Deseja apagar todas as regiões cadastradas?')) {
                    setPolygons([]);
                    setSelectedPolygonId(null);
                  }
                }}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          {/* Selected Zone Editor */}
          {selectedZone ? (
            <div className="flex flex-col gap-2.5 bg-zinc-900 border border-amber-500/50 rounded-xl p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Editar Região</span>
                <button
                  onClick={() => handleDeletePolygon(selectedZone.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded cursor-pointer"
                  title="Excluir região"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Nome da Região</label>
                <input
                  type="text"
                  value={selectedZone.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolygons((prev) =>
                      prev.map((p) => (p.id === selectedZone.id ? { ...p, name: val } : p))
                    );
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Tipo de Região</label>
                <select
                  value={selectedZone.type}
                  onChange={(e) => {
                    const newType = e.target.value as MapZoneType;
                    setPolygons((prev) =>
                      prev.map((p) => (p.id === selectedZone.id ? { ...p, type: newType } : p))
                    );
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {(['bloqueado', 'agua', 'caminhavel', 'porta', 'ponte'] as MapZoneType[]).map((t) => (
                    <option key={t} value={t}>
                      {ZONE_TYPE_CONFIG[t].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800">
                Vértices: {selectedZone.points.length} • ID: {selectedZone.id}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 italic text-center py-2 bg-zinc-950/40 rounded-lg border border-zinc-850">
              Clique em uma região no mapa ou na lista abaixo para editar
            </div>
          )}

          {/* Zones List */}
          <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
            {polygons.map((poly) => {
              const cfg = ZONE_TYPE_CONFIG[poly.type] || ZONE_TYPE_CONFIG.bloqueado;
              const isSelected = selectedPolygonId === poly.id;
              return (
                <div
                  key={poly.id}
                  onClick={() => setSelectedPolygonId(poly.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800 border-amber-500/80 shadow-md'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.stroke }}
                    />
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-bold text-zinc-200 truncate">{poly.name}</span>
                      <span className="text-[10px] text-zinc-400">{cfg.label.split(' ')[0]}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePolygon(poly.id);
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ═══ MODAL DE JSON (EXPORT / IMPORT) ═══ */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f141d] border border-zinc-700 rounded-2xl p-5 w-full max-w-xl flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="font-serif font-black text-amber-300 text-sm">
                Dados Estruturados em Coordenadas Normalizadas (JSON)
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Coordenadas de 0.0 a 1.0 prontas para salvar ou carregar nos perfis de colisão:
            </p>

            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Cole ou edite o JSON das regiões aqui..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg cursor-pointer border border-zinc-700"
                >
                  {copySuccess ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copySuccess ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg cursor-pointer border border-zinc-700"
                >
                  <Download size={13} />
                  <span>Baixar Arquivo</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={handleImportJson}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-lg cursor-pointer shadow-md"
                >
                  <Check size={13} />
                  <span>Salvar e Aplicar no Jogo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
