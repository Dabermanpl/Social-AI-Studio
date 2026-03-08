import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Download, 
  Square, 
  RectangleHorizontal, 
  RectangleVertical, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Trash2,
  ChevronRight,
  LayoutGrid,
  Info,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MessageSquare,
  Edit,
  Key,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { Message, AspectRatio, Tab } from './types';
import { generateChatResponse, generateImage } from './services/gemini';
import { Editor } from './components/Editor';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const ASPECT_RATIOS: { label: string; value: AspectRatio; icon: React.ReactNode }[] = [
  { label: 'Kwadrat (1:1)', value: '1:1', icon: <Square className="w-4 h-4" /> },
  { label: 'Krajobraz (16:9)', value: '16:9', icon: <RectangleHorizontal className="w-4 h-4" /> },
  { label: 'Portret (9:16)', value: '9:16', icon: <RectangleVertical className="w-4 h-4" /> },
  { label: 'Klasyczny (4:3)', value: '4:3', icon: <RectangleHorizontal className="w-4 h-4 opacity-70" /> },
  { label: 'Pionowy (3:4)', value: '3:4', icon: <RectangleVertical className="w-4 h-4 opacity-70" /> },
];

const GeneratingCard = ({ aspectRatio }: { aspectRatio: AspectRatio }) => {
  const ratioClass = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '4:3': 'aspect-[4/3]',
    '3:4': 'aspect-[3/4]',
  }[aspectRatio];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className={cn(
        "w-full max-w-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative",
        ratioClass
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10 animate-pulse" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <Sparkles className="w-4 h-4 text-white absolute -top-1 -right-1 animate-bounce" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Tworzenie grafiki</span>
          <div className="flex gap-1">
            <motion.div 
              animate={{ opacity: [0.2, 1, 0.2] }} 
              transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
              className="w-1 h-1 bg-emerald-500 rounded-full" 
            />
            <motion.div 
              animate={{ opacity: [0.2, 1, 0.2] }} 
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
              className="w-1 h-1 bg-emerald-500 rounded-full" 
            />
            <motion.div 
              animate={{ opacity: [0.2, 1, 0.2] }} 
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
              className="w-1 h-1 bg-emerald-500 rounded-full" 
            />
          </div>
        </div>
      </div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </motion.div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Cześć! Jestem Twoim asystentem do tworzenia grafik w mediach społecznościowych. Opisz mi, co chciałbyś wygenerować, a ja pomogę Ci stworzyć idealny obraz!',
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('1:1');
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const openKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
    }
  };
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (referenceImages.length >= 2) {
        alert('Możesz dodać maksymalnie 2 obrazy referencyjne.');
        return;
      }

      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be selected again if removed
    e.target.value = '';
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() || isChatLoading || isImageLoading) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsChatLoading(true);
    setError(null);

    try {
      const responseText = await generateChatResponse([...messages, userMessage]);
      
      const modelMessage: Message = {
        role: 'model',
        text: responseText || 'Przepraszam, wystąpił błąd.',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, modelMessage]);

      const shouldGenerate = responseText?.toLowerCase().includes('generuję') || 
                            responseText?.toLowerCase().includes('tworzę obraz');

      if (shouldGenerate) {
        handleGenerateImage(userMessage.text);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setError('Przekroczono limit zapytań (429). Wybierz własny klucz API w ustawieniach projektu lub spróbuj później.');
      } else {
        setError('Wystąpił błąd podczas komunikacji z AI.');
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateImage = async (prompt: string, overrideRefs?: string[]) => {
    setIsImageLoading(true);
    setError(null);
    const refsToUse = overrideRefs || referenceImages;
    try {
      const imageUrl = await generateImage(prompt, selectedRatio, refsToUse);
      if (imageUrl) {
        setLastGeneratedImage(imageUrl);
        setMessages(prev => [...prev, {
          role: 'model',
          text: refsToUse.length > 0 ? `Oto grafika wygenerowana na podstawie Twoich ${refsToUse.length} obrazów referencyjnych!` : 'Oto Twoja wygenerowana grafika!',
          image: imageUrl,
          referenceImages: refsToUse,
          timestamp: Date.now(),
        }]);
        if (!overrideRefs) setReferenceImages([]); // Clear references after use only if not regenerating
      }
    } catch (err: any) {
      console.error('Image error:', err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setError('Przekroczono limit zapytań (429) dla generowania obrazów.');
      } else {
        setError('Wystąpił błąd podczas generowania obrazu.');
      }
    } finally {
      setIsImageLoading(false);
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `social-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearChat = () => {
    setMessages([{
      role: 'model',
      text: 'Cześć! Jestem Twoim asystentem do tworzenia grafik w mediach społecznościowych. Opisz mi, co chciałbyś wygenerować, a ja pomogę Ci stworzyć idealny obraz!',
      timestamp: Date.now(),
    }]);
    setLastGeneratedImage(null);
    setReferenceImages([]);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-[#0F0F0F]">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Social AI</h1>
        </div>

        <div className="p-4 mx-6 mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Status API</span>
            <div className={cn("w-2 h-2 rounded-full", hasKey ? "bg-emerald-500" : "bg-amber-500")} />
          </div>
          <p className="text-[11px] text-white/60 mb-3">
            {hasKey ? "Używasz własnego klucza API (brak limitów)." : "Używasz darmowego klucza (możliwe limity)."}
          </p>
          <button 
            onClick={openKeyDialog}
            className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Key className="w-3 h-3" />
            {hasKey ? "Zmień klucz API" : "Dodaj własny klucz"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-white/40 uppercase tracking-widest">
              <LayoutGrid className="w-3 h-3" />
              Format Obrazu
            </div>
            <div className="grid gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setSelectedRatio(ratio.value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-sm",
                    selectedRatio === ratio.value 
                      ? "bg-white/10 text-white border border-white/20 shadow-lg" 
                      : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                >
                  {ratio.icon}
                  {ratio.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-white/40 uppercase tracking-widest">
              <Info className="w-3 h-3" />
              Wskazówki
            </div>
            <div className="space-y-3 text-sm text-white/60">
              <p className="p-3 bg-white/5 rounded-lg border border-white/5">
                Bądź precyzyjny w opisie kolorów, oświetlenia i stylu (np. "neonowy", "fotorealistyczny").
              </p>
              <p className="p-3 bg-white/5 rounded-lg border border-white/5">
                Możesz poprosić o konkretny styl mediów społecznościowych, np. "estetyka Instagrama".
              </p>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-white/10">
          <button 
            onClick={clearChat}
            className="w-full flex items-center justify-center gap-2 p-3 text-sm text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Wyczyść czat
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-8 border-b border-white/5 bg-[#0A0A0A] py-3">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium",
              activeTab === 'chat' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Czat
          </button>
          <button 
            onClick={() => setActiveTab('editor')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium",
              activeTab === 'editor' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <Edit className="w-4 h-4" />
            Edytor
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'chat' ? (
            <div className="flex flex-col h-full">
              {/* Chat Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
              >
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="max-w-3xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-200 font-medium">{error}</p>
                        {error.includes('429') && (
                          <button 
                            onClick={openKeyDialog}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
                          >
                            <Key className="w-3 h-3" />
                            Użyj własnego klucza API
                          </button>
                        )}
                      </div>
                      <button onClick={() => setError(null)} className="text-white/40 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.timestamp + idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col max-w-3xl",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-emerald-500 text-black font-medium" 
                    : "bg-white/5 border border-white/10 text-white/90"
                )}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>

                {msg.image && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-4 relative group"
                  >
                    <img 
                      src={msg.image} 
                      alt="Generated" 
                      onClick={() => {
                        setPreviewImage(msg.image!);
                        setZoomScale(1);
                      }}
                      className="rounded-2xl border border-white/10 shadow-2xl max-w-full h-auto max-h-[500px] object-contain cursor-zoom-in hover:border-emerald-500/50 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-4">
                      <button 
                        onClick={() => downloadImage(msg.image!)}
                        className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleGenerateImage(messages[idx-1]?.text || '', msg.referenceImages)}
                        className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        title="Ponów"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditorImage(msg.image!);
                          setActiveTab('editor');
                        }}
                        className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        title="Dodaj do edytora"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
            
            {isImageLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-start mr-auto max-w-3xl"
              >
                <div className="p-4 rounded-2xl text-sm leading-relaxed bg-white/5 border border-white/10 text-white/90 mb-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                    Generuję obraz dla Ciebie...
                  </div>
                </div>
                <GeneratingCard aspectRatio={selectedRatio} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {isChatLoading && !isImageLoading && (
            <div className="flex items-center gap-3 text-white/40 text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI myśli...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1 rounded-full text-[10px] uppercase tracking-tighter text-white/40 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                Zasilane przez Gemini 3.1 Pro & Flash Image
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              <AnimatePresence>
                {referenceImages.map((img, idx) => (
                  <motion.div
                    key={`ref-${idx}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="relative inline-block group"
                  >
                    <img
                      src={img}
                      alt={`Reference ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-xl border border-white/20 shadow-xl"
                    />
                    <button
                      onClick={() => removeReferenceImage(idx)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-black uppercase">
                      Ref {idx + 1}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <div className="relative flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-emerald-500/50 transition-colors shadow-2xl">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={referenceImages.length >= 2}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  referenceImages.length > 0 
                    ? "bg-emerald-500/20 text-emerald-500" 
                    : "text-white/40 hover:text-white hover:bg-white/5",
                  referenceImages.length >= 2 && "opacity-50 cursor-not-allowed"
                )}
                title={referenceImages.length >= 2 ? "Maksymalnie 2 obrazy" : "Dodaj obraz referencyjny"}
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Opisz obraz, który chcesz stworzyć..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-3 min-h-[50px] max-h-[200px] resize-none"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isChatLoading || isImageLoading}
                className="p-3 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors"
              >
                {isChatLoading || isImageLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-center mt-3 text-white/20">
              Użyj Shift + Enter dla nowej linii. AI może generować obrazy na podstawie Twojego opisu i obrazu referencyjnego.
            </p>
          </div>
        </div>
      </div>
    ) : (
      <Editor initialImage={editorImage || undefined} />
    )}
  </div>
</main>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Controls */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full z-10">
                <button 
                  onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                  className="p-1 hover:text-emerald-400 transition-colors"
                  title="Pomniejsz"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono w-12 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button 
                  onClick={() => setZoomScale(prev => Math.min(3, prev + 0.25))}
                  className="p-1 hover:text-emerald-400 transition-colors"
                  title="Powiększ"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setZoomScale(1)}
                  className="p-1 hover:text-emerald-400 transition-colors text-[10px] font-bold uppercase"
                  title="Resetuj zoom"
                >
                  Reset
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button 
                  onClick={() => downloadImage(previewImage)}
                  className="p-1 hover:text-emerald-400 transition-colors"
                  title="Pobierz"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1 hover:text-red-400 transition-colors"
                  title="Zamknij"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image Container */}
              <div className="overflow-auto rounded-xl shadow-2xl border border-white/10 bg-[#0F0F0F] flex items-center justify-center">
                <motion.img
                  src={previewImage}
                  alt="Preview"
                  animate={{ scale: zoomScale }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="max-w-full max-h-[80vh] object-contain cursor-grab active:cursor-grabbing"
                  referrerPolicy="no-referrer"
                  drag={zoomScale > 1}
                  dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                />
              </div>
              
              <p className="mt-4 text-white/40 text-xs">
                Kliknij poza obrazem, aby zamknąć. Możesz przesuwać obraz przy powiększeniu.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
