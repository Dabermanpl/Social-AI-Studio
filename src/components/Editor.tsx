import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Text as KonvaText, Transformer, Group, Rect } from 'react-konva';
import useImage from 'use-image';
import { 
  Type, 
  Layers, 
  Download, 
  Trash2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  ChevronUp, 
  ChevronDown,
  Plus,
  Move,
  Image as ImageIcon,
  Pipette
} from 'lucide-react';
import { Layer, AspectRatio } from '../types';
import { cn } from '../lib/utils';

interface EditorProps {
  initialImage?: string;
  currentRatio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
}

const ImageLayer = ({ layer, isSelected, onSelect, onChange }: { 
  layer: Layer; 
  isSelected: boolean; 
  onSelect: () => void;
  onChange: (newAttrs: Partial<Layer>) => void;
}) => {
  const [img] = useImage(layer.content, 'anonymous');
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        image={img}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation || 0}
        draggable={!layer.locked && layer.visible}
        visible={layer.visible}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !layer.locked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

const TextLayer = ({ layer, isSelected, onSelect, onChange }: { 
  layer: Layer; 
  isSelected: boolean; 
  onSelect: () => void;
  onChange: (newAttrs: Partial<Layer>) => void;
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaText
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        text={layer.content}
        x={layer.x}
        y={layer.y}
        fontSize={layer.fontSize || 24}
        fill={layer.fill || '#ffffff'}
        rotation={layer.rotation || 0}
        draggable={!layer.locked && layer.visible}
        visible={layer.visible}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(5, node.fontSize() * scaleX),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !layer.locked && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            newBox.width = Math.max(30, newBox.width);
            return newBox;
          }}
        />
      )}
    </>
  );
};

export const Editor: React.FC<EditorProps> = ({ initialImage, currentRatio, onRatioChange }) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const artboardRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [stageCursor, setStageCursor] = useState<string>('default');

  const getBoardSize = (ratio: AspectRatio) => {
    const maxWidth = 500;
    const maxHeight = 500;
    
    let width = maxWidth;
    let height = maxHeight;

    switch(ratio) {
      case '1:1': width = 500; height = 500; break;
      case '16:9': width = 500; height = 281; break;
      case '9:16': width = 281; height = 500; break;
      case '4:3': width = 500; height = 375; break;
      case '3:4': width = 375; height = 500; break;
    }
    return { width, height };
  };

  const boardSize = getBoardSize(currentRatio);
  const boardOffset = {
    x: stageSize.width / 2 - boardSize.width / 2,
    y: stageSize.height / 2 - boardSize.height / 2,
  };

  useEffect(() => {
    if (initialImage) {
      const id = Math.random().toString(36).substr(2, 9);
      const img = new Image();
      img.src = initialImage;
      img.onload = () => {
        const newLayer: Layer = {
          id,
          type: 'image',
          content: initialImage,
          x: 50,
          y: 50,
          width: img.width > 500 ? 500 : img.width,
          height: img.width > 500 ? (img.height * (500 / img.width)) : img.height,
          visible: true,
          locked: false,
        };
        setLayers([newLayer]);
        setSelectedId(id);
      };
    }
  }, [initialImage]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
      
      // Photoshop Shortcuts logic
      if (!isInput) {
        // Space for Pan (Hand Tool)
        if (e.code === 'Space') {
          e.preventDefault();
          setIsSpacePressed(true);
          setStageCursor('grab');
        }

        // T for Text
        if (e.key.toLowerCase() === 't') addText();
        
        // V for Selection
        if (e.key.toLowerCase() === 'v') setSelectedId(null);

        // Delete/Backspace for Delete Layer
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
          deleteLayer(selectedId);
        }
      }

      // Cmd/Ctrl based shortcuts (work even if input is focused if needed, but usually not)
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomCentered(1.1);
        }
        if (e.key === '-') {
          e.preventDefault();
          zoomCentered(0.9);
        }
        if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setStageCursor('default');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, stageScale, stagePos]); // Dependencies for zoom and delete logic

  const zoomCentered = (factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = stage.scaleX();
    const newScale = Math.max(0.1, Math.min(10, oldScale * factor));
    
    // Zoom relative to stage center
    const centerX = stage.width() / 2;
    const centerY = stage.height() / 2;
    
    const mousePointTo = {
      x: (centerX - stage.x()) / oldScale,
      y: (centerY - stage.y()) / oldScale,
    };

    setStageScale(newScale);
    setStagePos({
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    });
  };

  const addText = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newLayer: Layer = {
      id,
      type: 'text',
      content: 'Twój tekst',
      x: stageSize.width / 2 - 50,
      y: stageSize.height / 2 - 12,
      fontSize: 32,
      fill: '#ffffff',
      visible: true,
      locked: false,
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedId(id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const img = new Image();
      img.src = content;
      img.onload = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const newLayer: Layer = {
          id,
          type: 'image',
          content,
          x: 50,
          y: 50,
          width: img.width > 300 ? 300 : img.width,
          height: img.width > 300 ? (img.height * (300 / img.width)) : img.height,
          visible: true,
          locked: false,
        };
        setLayers(prev => [...prev, newLayer]);
        setSelectedId(id);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset for same file re-upload
  };
  
  const handleEyeDropper = async () => {
    if (!window.hasOwnProperty('EyeDropper')) {
      alert('Twoja przeglądarka nie obsługuje narzędzia pipety.');
      return;
    }
    
    try {
      // @ts-ignore - EyeDropper is a new API
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (selectedId) {
        handleLayerChange(selectedId, { fill: result.sRGBHex });
      }
    } catch (e) {
      console.error('EyeDropper failed:', e);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // MacBook pinch-to-zoom gesture uses ctrlKey + deltaY
    const isPinch = e.evt.ctrlKey;
    const delta = isPinch ? -e.evt.deltaY * 0.01 : -e.evt.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(10, oldScale + delta));

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const resetZoom = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const PRESET_COLORS = [
    '#ffffff', '#000000', '#3b82f6', '#10b981', '#ef4444', 
    '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
  ];

  const handleLayerChange = (id: string, newAttrs: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...newAttrs } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const newLayers = [...layers];
    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex >= 0 && newIndex < layers.length) {
      [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
      setLayers(newLayers);
    }
  };

  const download = () => {
    setSelectedId(null);
    setTimeout(() => {
      // Create a temporary canvas with original dimensions (not the zoomed editor view)
      // to ensure pixel-perfect export.
      const uri = artboardRef.current.toDataURL({
        x: boardOffset.x - 20, // include shadow/margin if needed, or just board
        y: boardOffset.y - 20,
        width: boardSize.width + 40,
        height: boardSize.height + 40,
        pixelRatio: 2
      });
      // Actually, for a clean export, we just want the board:
      const cleanUri = artboardRef.current.toDataURL({
        x: boardOffset.x,
        y: boardOffset.y,
        width: boardSize.width,
        height: boardSize.height,
        pixelRatio: 3 // high density
      });

      const link = document.createElement('a');
      link.download = `social-ai-${currentRatio.replace(':', '-')}.png`;
      link.href = cleanUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 100);
  };

  return (
    <div className="flex h-full bg-[#0a0a0a] overflow-hidden">
      {/* Toolbar */}
      <div className="w-16 border-r border-white/10 flex flex-col items-center py-6 gap-6 bg-[#0f0f0f]">
        <button 
          onClick={addText}
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
          title="Dodaj tekst"
        >
          <Type className="w-6 h-6" />
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
          title="Importuj obraz (JPG, PNG, GIF)"
        >
          <ImageIcon className="w-6 h-6" />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/jpeg,image/png,image/gif" 
          className="hidden" 
        />
        <button 
          onClick={download}
          className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
          title="Zapisz"
        >
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px]">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          ref={stageRef}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          draggable={isSpacePressed}
          style={{ cursor: isSpacePressed ? (stageCursor === 'grabbing' ? 'grabbing' : 'grab') : 'default' }}
          onDragStart={(e) => {
            if (e.target === stageRef.current) {
              setStageCursor('grabbing');
            }
          }}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setStageCursor('grab');
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onMouseDown={(e) => {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) setSelectedId(null);
          }}
        >
          <KonvaLayer ref={artboardRef}>
            {/* Artboard Shadow */}
            <Rect
              x={boardOffset.x}
              y={boardOffset.y}
              width={boardSize.width}
              height={boardSize.height}
              fill="white"
              shadowColor="black"
              shadowBlur={20}
              shadowOpacity={0.1}
              shadowOffset={{ x: 0, y: 5 }}
            />

            {/* Artboard Content with Clipping */}
            <Group clipX={boardOffset.x} clipY={boardOffset.y} clipWidth={boardSize.width} clipHeight={boardSize.height}>
              {/* White Artboard Background */}
              <Rect
                x={boardOffset.x}
                y={boardOffset.y}
                width={boardSize.width}
                height={boardSize.height}
                fill="white"
              />
              
              {/* Layers Grouped for Relative Offsetting */}
              <Group x={boardOffset.x} y={boardOffset.y}>
                {layers.map((layer) => (
                  layer.type === 'image' ? (
                    <ImageLayer
                      key={layer.id}
                      layer={layer}
                      isSelected={layer.id === selectedId}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={(newAttrs) => handleLayerChange(layer.id, newAttrs)}
                    />
                  ) : (
                    <TextLayer
                      key={layer.id}
                      layer={layer}
                      isSelected={layer.id === selectedId}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={(newAttrs) => handleLayerChange(layer.id, newAttrs)}
                    />
                  )
                ))}
              </Group>
            </Group>
          </KonvaLayer>
        </Stage>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl z-10 pointer-events-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            Zoom
          </div>
          <div className="text-xs font-mono text-emerald-500 min-w-[40px] text-center">
            {Math.round(stageScale * 100)}%
          </div>
          <button 
            onClick={resetZoom}
            className="text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Layers Panel */}
      <div className="w-72 border-l border-white/10 flex flex-col bg-[#0f0f0f]">
        <div className="p-4 border-bottom border-white/10 flex items-center gap-2 text-white/60 font-medium">
          <Layers className="w-4 h-4" />
          Warstwy
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {layers.slice().reverse().map((layer, i) => {
            const actualIndex = layers.length - 1 - i;
            return (
              <div 
                key={layer.id}
                onClick={() => setSelectedId(layer.id)}
                className={cn(
                  "p-3 rounded-lg flex items-center gap-3 group cursor-pointer transition-colors",
                  selectedId === layer.id ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="text-white/40">
                  {layer.type === 'image' ? <Move className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                </div>
                <div className="flex-1 text-sm text-white/80 truncate">
                  {layer.type === 'image' ? 'Obraz' : layer.content}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveLayer(actualIndex, 'up'); }}
                    disabled={actualIndex === layers.length - 1}
                    className="p-1 hover:text-white text-white/40 disabled:opacity-0"
                    title="Przesuń wyżej"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveLayer(actualIndex, 'down'); }}
                    disabled={actualIndex === 0}
                    className="p-1 hover:text-white text-white/40 disabled:opacity-0"
                    title="Przesuń niżej"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLayerChange(layer.id, { visible: !layer.visible }); }}
                    className="p-1 hover:text-white text-white/40"
                    title={layer.visible ? "Ukryj" : "Pokaż"}
                  >
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLayerChange(layer.id, { locked: !layer.locked }); }}
                    className="p-1 hover:text-white text-white/40"
                  >
                    {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                    className="p-1 hover:text-red-500 text-white/40"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {selectedId && layers.find(l => l.id === selectedId)?.type === 'text' && (
          <div className="p-4 border-t border-white/10 bg-black/20">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">Edytuj tekst</label>
            <textarea 
              value={layers.find(l => l.id === selectedId)?.content}
              onChange={(e) => handleLayerChange(selectedId, { content: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none h-20"
            />
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Kolor</label>
                  <button 
                    onClick={handleEyeDropper}
                    className="p-1 hover:text-emerald-500 text-white/40 transition-colors"
                    title="Pipeta"
                  >
                    <Pipette className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => handleLayerChange(selectedId, { fill: color })}
                      className={cn(
                        "w-full aspect-square rounded-md border border-white/10 transition-transform hover:scale-110",
                        layers.find(l => l.id === selectedId)?.fill === color ? "ring-2 ring-emerald-500" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1.5">
                  <div 
                    className="w-6 h-6 rounded border border-white/10 shrink-0"
                    style={{ backgroundColor: layers.find(l => l.id === selectedId)?.fill || '#ffffff' }}
                  />
                  <input 
                    type="text" 
                    value={layers.find(l => l.id === selectedId)?.fill || '#ffffff'}
                    onChange={(e) => handleLayerChange(selectedId, { fill: e.target.value })}
                    className="bg-transparent border-none p-0 text-xs font-mono text-white/80 focus:ring-0 w-full"
                  />
                  <input 
                    type="color" 
                    value={layers.find(l => l.id === selectedId)?.fill || '#ffffff'}
                    onChange={(e) => handleLayerChange(selectedId, { fill: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">Rozmiar Czcionki</label>
                <div className="flex gap-2">
                  <input 
                    type="range"
                    min="10"
                    max="200"
                    value={layers.find(l => l.id === selectedId)?.fontSize || 32}
                    onChange={(e) => handleLayerChange(selectedId, { fontSize: parseInt(e.target.value) })}
                    className="flex-1 accent-emerald-500 bg-white/5"
                  />
                  <span className="text-xs text-white/40 font-mono w-8">{layers.find(l => l.id === selectedId)?.fontSize || 32}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-4 border-t border-white/10 bg-black/20">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Format Projektu</label>
          <div className="grid grid-cols-2 gap-2">
            {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map((r) => (
              <button
                key={r}
                onClick={() => onRatioChange(r)}
                className={cn(
                  "p-2 text-[10px] font-bold rounded-lg border transition-all",
                  currentRatio === r 
                    ? "bg-emerald-500 text-black border-emerald-500" 
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
