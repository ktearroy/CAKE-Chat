/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import {
  Home,
  Bed,
  Bath,
  TreePine,
  Utensils,
  Heart,
  Zap,
  Settings,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Loader2
} from 'lucide-react';

type Room = 'bedroom' | 'living' | 'bathroom' | 'outdoor';

interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
}

interface Item {
  id: string;
  name: string;
  emoji: string;
  type: 'food' | 'toy' | 'household' | 'special';
  rarity: 'common' | 'rare' | 'epic';
}

interface PetDna {
  bodyColor: string;
  eyeColor: string;
  shape: 'square' | 'circle' | 'rounded';
  accessory: 'none' | 'hat' | 'bow' | 'glasses' | 'antenna';
  name: string;
}

export default function App() {
  const [room, setRoom] = useState<Room>('living');
  const [stats, setStats] = useState<PetStats>({
    hunger: 80,
    happiness: 80,
    energy: 100,
    cleanliness: 100
  });
  const [isSleeping, setIsSleeping] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [petAction, setPetAction] = useState<'idle' | 'eating' | 'bathing' | 'walking'>('idle');

  // Customization state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [petDna, setPetDna] = useState<PetDna>({
    bodyColor: '#0f380f',
    eyeColor: '#9bbc0f',
    shape: 'rounded',
    accessory: 'none',
    name: 'PIXEL'
  });

  // Items collected
  const [collectedItems, setCollectedItems] = useState<Item[]>([]);

  // Random items that can be found
  const randomItems: Item[] = [
    // Food items
    { id: 'apple', name: '苹果', emoji: '🍎', type: 'food', rarity: 'common' },
    { id: 'banana', name: '香蕉', emoji: '🍌', type: 'food', rarity: 'common' },
    { id: 'cookie', name: '饼干', emoji: '🍪', type: 'food', rarity: 'common' },
    { id: 'cake', name: '蛋糕', emoji: '🍰', type: 'food', rarity: 'rare' },
    { id: 'icecream', name: '冰淇淋', emoji: '🍦', type: 'food', rarity: 'rare' },
    
    // Toy items
    { id: 'ball', name: '球', emoji: '⚽', type: 'toy', rarity: 'common' },
    { id: 'teddy', name: '泰迪熊', emoji: '🧸', type: 'toy', rarity: 'common' },
    { id: 'doll', name: '娃娃', emoji: '🪆', type: 'toy', rarity: 'rare' },
    { id: 'robot', name: '机器人玩具', emoji: '🤖', type: 'toy', rarity: 'epic' },
    
    // Household items
    { id: 'book', name: '书', emoji: '📚', type: 'household', rarity: 'common' },
    { id: 'lamp', name: '台灯', emoji: '💡', type: 'household', rarity: 'common' },
    { id: 'plant', name: '盆栽', emoji: '🪴', type: 'household', rarity: 'rare' },
    { id: 'clock', name: '时钟', emoji: '🕰️', type: 'household', rarity: 'rare' },
    
    // Special items
    { id: 'gem', name: '宝石', emoji: '💎', type: 'special', rarity: 'epic' },
    { id: 'crown', name: '皇冠', emoji: '👑', type: 'special', rarity: 'epic' },
    { id: 'magic_wand', name: '魔法棒', emoji: '🪄', type: 'special', rarity: 'epic' }
  ];

  // Game Loop for stats decay
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        hunger: Math.max(0, prev.hunger - (isSleeping ? 0.5 : 2)),
        happiness: Math.max(0, prev.happiness - 1),
        energy: isSleeping
          ? Math.min(100, prev.energy + 5)
          : Math.max(0, prev.energy - 1),
        cleanliness: Math.max(0, prev.cleanliness - 1.5)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  const icons = [
    { id: 'feed', icon: Utensils, label: 'FEED' },
    { id: 'play', icon: Heart, label: 'PLAY' },
    { id: 'bath', icon: Bath, label: 'BATH' },
    { id: 'sleep', icon: Bed, label: 'SLEEP' },
    { id: 'outdoor', icon: TreePine, label: 'OUT' },
    { id: 'customize', icon: Sparkles, label: 'GEN' },
    { id: 'home', icon: Home, label: 'HOME' },
  ];

  const handleButtonA = () => {
    if (isCustomizing) return;
    setSelectedIcon((prev) => (prev + 1) % icons.length);
  };

  const handleButtonB = () => {
    if (isCustomizing) {
      generatePet();
      return;
    }
    const action = icons[selectedIcon].id;
    executeAction(action);
  };

  const handleButtonC = () => {
    if (isCustomizing) {
      setIsCustomizing(false);
      setPrompt('');
      return;
    }
    setMessage(null);
    setPetAction('idle');
  };

  const generatePet = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a pixel pet DNA based on this description: "${prompt}".
        Return JSON with: bodyColor (hex), eyeColor (hex), shape (square, circle, rounded), accessory (none, hat, bow, glasses, antenna), name (max 6 chars).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bodyColor: { type: Type.STRING },
              eyeColor: { type: Type.STRING },
              shape: { type: Type.STRING, enum: ['square', 'circle', 'rounded'] },
              accessory: { type: Type.STRING, enum: ['none', 'hat', 'bow', 'glasses', 'antenna'] },
              name: { type: Type.STRING }
            },
            required: ['bodyColor', 'eyeColor', 'shape', 'accessory', 'name']
          }
        }
      });

      const dna = JSON.parse(response.text);
      setPetDna(dna);
      setIsCustomizing(false);
      setPrompt('');
      showMessage("EVOLVED!");
    } catch (error) {
      console.error(error);
      showMessage("ERROR");
    } finally {
      setIsGenerating(false);
    }
  };

  const executeAction = (action: string) => {
    if (isSleeping && action !== 'sleep') {
      showMessage("Zzz...");
      return;
    }

    switch (action) {
      case 'feed':
        setPetAction('eating');
        setStats(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 20) }));
        showMessage("YUM!");
        setTimeout(() => setPetAction('idle'), 2000);
        break;
      case 'play':
        setStats(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 20), energy: Math.max(0, prev.energy - 10) }));
        showMessage("YAY!");
        break;
      case 'bath':
        setRoom('bathroom');
        setPetAction('bathing');
        setStats(prev => ({ ...prev, cleanliness: 100 }));
        showMessage("SPLASH!");
        setTimeout(() => setPetAction('idle'), 2000);
        break;
      case 'sleep':
        setIsSleeping(!isSleeping);
        setRoom('bedroom');
        showMessage(isSleeping ? "AWAKE" : "SLEEPING");
        break;
      case 'outdoor':
        setRoom('outdoor');
        setPetAction('walking');
        setStats(prev => ({ ...prev, cleanliness: Math.max(0, prev.cleanliness - 5) }));
        
        // Random event: sometimes find an item
        if (Math.random() < 0.4) { // 40% chance to find an item
          const foundItem = randomItems[Math.floor(Math.random() * randomItems.length)];
          setCollectedItems(prev => [...prev, foundItem]);
          
          // Store in global data for backpack
          if ((window as any).updateBackpackItems) {
            (window as any).updateBackpackItems(foundItem);
          }
          
          showMessage(`FOUND ${foundItem.emoji}!`);
        } else {
          showMessage("OUTSIDE!");
        }
        break;
      case 'customize':
        setIsCustomizing(true);
        break;
      case 'home':
        setRoom('living');
        setPetAction('idle');
        showMessage("HOME");
        break;
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const getRoomBg = () => {
    switch (room) {
      case 'bedroom': return 'bg-[#8bac0f]';
      case 'living': return 'bg-[#9bbc0f]';
      case 'bathroom': return 'bg-[#8bac0f]';
      case 'outdoor': return 'bg-[#9bbc0f]';
      default: return 'bg-[#9bbc0f]';
    }
  };

  const getShapeClass = () => {
    switch (petDna.shape) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-none';
      default: return 'rounded-2xl';
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 h-full overflow-y-auto px-4 py-4">
      {/* Tamagotchi Device */}
      <div className="relative w-80 h-96 bg-pink-200 rounded-[100px] border-8 border-pink-300 shadow-2xl flex flex-col items-center pt-12 pb-8 px-8 flex-shrink-0">

        {/* Screen Frame */}
        <div className="w-full h-56 bg-gray-800 rounded-xl p-4 border-4 border-pink-300 flex flex-col">

          {/* LCD Screen */}
          <div className={`lcd-screen w-full h-full rounded flex flex-col relative ${getRoomBg()}`}>

            {/* Top Status Bar */}
            <div className="flex justify-between px-2 py-1 border-b border-[#0f380f]/20">
              <div className="flex gap-1">
                <Utensils size={8} className="text-[#0f380f]" />
                <div className="w-6 h-1.5 bg-[#0f380f]/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0f380f]" style={{ width: `${stats.hunger}%` }} />
                </div>
              </div>
              <div className="flex gap-1">
                <Heart size={8} className="text-[#0f380f]" />
                <div className="w-6 h-1.5 bg-[#0f380f]/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0f380f]" style={{ width: `${stats.happiness}%` }} />
                </div>
              </div>
              <div className="flex gap-1">
                <Bath size={8} className="text-[#0f380f]" />
                <div className="w-6 h-1.5 bg-[#0f380f]/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0f380f]" style={{ width: `${stats.cleanliness}%` }} />
                </div>
              </div>
            </div>

            {/* Pet Container (Central Area) */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              {/* Room Background Elements (Now scoped to central area) */}
              <div className="absolute inset-0 pointer-events-none">
                {room === 'bedroom' && (
                  <>
                    {/* Window */}
                    <div className="absolute top-4 left-4 w-10 h-12 border-2 border-[#0f380f] flex flex-wrap">
                      <div className="w-1/2 h-1/2 border-r border-b border-[#0f380f]/30" />
                      <div className="w-1/2 h-1/2 border-b border-[#0f380f]/30" />
                      <div className="w-1/2 h-1/2 border-r border-[#0f380f]/30" />
                      <div className="w-1/2 h-1/2" />
                    </div>
                    {/* Bed */}
                    <div className="absolute bottom-2 right-2 w-28 h-16 border-2 border-[#0f380f] rounded-t-md bg-[#9bbc0f]">
                      <div className="absolute top-0 left-0 w-8 h-full border-r-2 border-[#0f380f] bg-[#0f380f]/10" />
                      <div className="absolute -top-3 left-2 w-6 h-4 border-2 border-[#0f380f] rounded-t-full bg-[#9bbc0f]" />
                    </div>
                  </>
                )}
                {room === 'living' && (
                  <>
                    {/* Sofa */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-[#0f380f] rounded-t-lg bg-[#9bbc0f]">
                      <div className="absolute -left-2 bottom-0 w-4 h-8 border-2 border-[#0f380f] rounded-t-md bg-[#9bbc0f]" />
                      <div className="absolute -right-2 bottom-0 w-4 h-8 border-2 border-[#0f380f] rounded-t-md bg-[#9bbc0f]" />
                    </div>
                    {/* TV */}
                    <div className="absolute top-6 right-4 w-12 h-10 border-2 border-[#0f380f] rounded-sm flex items-center justify-center bg-[#9bbc0f]">
                      <div className="w-8 h-6 border border-[#0f380f]/40" />
                      <div className="absolute -top-2 left-2 w-4 h-2 border-x border-t border-[#0f380f] bg-[#9bbc0f]" />
                    </div>
                  </>
                )}
                {room === 'bathroom' && (
                  <>
                    {/* Tiles Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#0f380f 1px, transparent 1px), linear-gradient(90deg, #0f380f 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                    {/* Mirror */}
                    <div className="absolute top-4 right-8 w-10 h-14 border-2 border-[#0f380f] rounded-t-full" />
                  </>
                )}
                {room === 'outdoor' && (
                  <>
                    {/* Sun/Moon */}
                    <div className="absolute top-4 right-6 w-8 h-8 rounded-full border-2 border-[#0f380f]">
                      <div className="absolute inset-1 rounded-full border border-[#0f380f]/20" />
                    </div>
                    {/* Clouds */}
                    <div className="absolute top-8 left-4 w-10 h-4 border-2 border-[#0f380f] rounded-full" />
                    <div className="absolute top-12 left-12 w-8 h-3 border-2 border-[#0f380f] rounded-full" />
                    {/* Tree */}
                    <div className="absolute bottom-4 left-2 w-8 h-12 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-[#0f380f]" />
                      <div className="w-2 h-4 border-x-2 border-b-2 border-[#0f380f]" />
                    </div>
                    {/* Grass */}
                    <div className="absolute bottom-0 w-full h-4 border-t-2 border-[#0f380f] flex justify-around items-end pb-1">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-0.5 h-1.5 bg-[#0f380f]" />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!isCustomizing ? (
                  <motion.div
                    key={JSON.stringify(petDna)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      x: room === 'bathroom' ? -44 : (isSleeping ? 35 : 0),
                      y: room === 'bathroom' ? 12 : (isSleeping ? 10 : 0),
                      rotate: isSleeping ? -90 : 0
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`relative flex flex-col items-center ${
                      isSleeping || petAction === 'eating' || room === 'bathroom' ? '' : 'animate-pet-wander'
                    }`}
                  >
                    {/* Bubbles during bath */}
                    {room === 'bathroom' && (
                      <div className="absolute -top-6 flex gap-1 z-20">
                        <motion.div
                          animate={{ y: [0, -4, 0], scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-3 h-3 rounded-full border border-[#0f380f] bg-white/40"
                        />
                        <motion.div
                          animate={{ y: [0, -6, 0], scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                          className="w-4 h-4 rounded-full border border-[#0f380f] bg-white/40 -mt-2"
                        />
                        <motion.div
                          animate={{ y: [0, -3, 0], scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.8, delay: 0.6 }}
                          className="w-2 h-2 rounded-full border border-[#0f380f] bg-white/40"
                        />
                      </div>
                    )}

                    {/* Accessory */}
                    {petDna.accessory === 'hat' && (
                      <div className="absolute -top-3 w-10 h-4 bg-[#0f380f] rounded-t-full border border-[#9bbc0f]/20 z-10" />
                    )}
                    {petDna.accessory === 'antenna' && (
                      <div className="absolute -top-4 w-0.5 h-4 bg-[#0f380f] z-10">
                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#0f380f]" />
                      </div>
                    )}
                    {petDna.accessory === 'bow' && (
                      <div className="absolute -top-2 flex gap-0.5 z-10">
                        <div className="w-3 h-3 bg-[#0f380f] rotate-45" />
                        <div className="w-3 h-3 bg-[#0f380f] -rotate-45" />
                      </div>
                    )}

                    {/* Pixel Pet Body */}
                    <div
                      className={`w-16 h-16 relative pet-shadow transition-all duration-500 ${getShapeClass()} ${isSleeping || room === 'bathroom' ? '' : 'animate-pet-step'}`}
                      style={{ backgroundColor: petDna.bodyColor }}
                    >
                      {/* Eyes */}
                      {!isSleeping ? (
                        <div className="flex justify-around w-full mt-4 px-2">
                          <div className={`w-2 h-2 rounded-full ${petDna.accessory === 'glasses' ? 'border-2 border-[#0f380f]' : ''}`} style={{ backgroundColor: petDna.eyeColor }} />
                          <div className={`w-2 h-2 rounded-full ${petDna.accessory === 'glasses' ? 'border-2 border-[#0f380f]' : ''}`} style={{ backgroundColor: petDna.eyeColor }} />
                        </div>
                      ) : (
                        <div className="flex justify-around w-full mt-5 px-2">
                          <div className="w-3 h-0.5" style={{ backgroundColor: petDna.eyeColor }} />
                          <div className="w-3 h-0.5" style={{ backgroundColor: petDna.eyeColor }} />
                        </div>
                      )}
                      {/* Mouth */}
                      <div className="w-4 h-1 mx-auto mt-2 rounded-full" style={{ backgroundColor: petDna.eyeColor }} />
                    </div>

                    {/* Action Indicators */}
                    {petAction === 'eating' && (
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: -20, opacity: 1 }}
                        className="absolute -top-4 text-[#0f380f] text-[8px]"
                      >
                        NOM NOM
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 w-full h-full p-4 flex flex-col items-center justify-center gap-2 z-[60] bg-[#9bbc0f]"
                  >
                    <div className="text-[#0f380f] text-[8px] text-center mb-2">DESCRIBE NEW PET:</div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Blue round cat with a hat"
                      className="w-full h-20 bg-[#0f380f]/10 border-2 border-[#0f380f] rounded p-2 text-[8px] text-[#0f380f] focus:outline-none resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      {isGenerating ? (
                        <Loader2 className="animate-spin text-[#0f380f]" size={16} />
                      ) : (
                        <div className="text-[6px] text-[#0f380f] opacity-50">PRESS [B] TO GEN</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Room Foreground Elements (rendered on top of pet) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {room === 'bathroom' && (
                  /* Bathtub (Opaque to hide pet's lower body) */
                  <div className="absolute bottom-2 left-4 w-24 h-12 border-2 border-[#0f380f] rounded-b-3xl bg-[#9bbc0f]">
                    {/* Faucet */}
                    <div className="absolute -top-2 left-2 w-4 h-2 border-x border-t border-[#0f380f] rounded-t-full bg-[#9bbc0f]" />
                    <div className="absolute top-2 right-3 w-2 h-2 rounded-full border border-[#0f380f]/40" />
                    {/* Water line */}
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-[#0f380f]/20" />
                    {/* Semi-transparent water overlay */}
                    <div className="absolute top-4 left-0 w-full h-8 bg-[#0f380f]/5 rounded-b-3xl" />
                  </div>
                )}
                {room === 'bedroom' && isSleeping && (
                  /* Blanket */
                  <div className="absolute bottom-2 right-2 w-20 h-16 border-2 border-l-0 border-[#0f380f] rounded-tr-md bg-[#9bbc0f] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[#0f380f]/5" />
                    <div className="absolute top-2 left-0 w-full h-0.5 bg-[#0f380f]/20" />
                    <div className="absolute top-6 left-0 w-full h-0.5 bg-[#0f380f]/20" />
                    <div className="absolute top-10 left-0 w-full h-0.5 bg-[#0f380f]/20" />
                    <div className="absolute top-14 left-0 w-full h-0.5 bg-[#0f380f]/20" />
                  </div>
                )}
              </div>

              {/* Message Overlay */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f380f] text-[#9bbc0f] px-2 py-1 text-[10px] rounded border border-[#9bbc0f] z-[100] whitespace-nowrap"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Icon Bar */}
            <div className="grid grid-cols-7 gap-0 border-t border-[#0f380f]/20 bg-[#0f380f]/5">
              {icons.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col items-center py-1 transition-colors ${selectedIcon === idx ? 'bg-[#0f380f] text-[#9bbc0f]' : 'text-[#0f380f]'}`}
                >
                  <item.icon size={10} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Label */}
        <div className="mt-4 text-pink-400 text-[10px] font-bold tracking-widest uppercase">
          {petDna.name} PET v1.0
        </div>

        {/* Buttons Section */}
        <div className="flex justify-between w-full mt-auto px-4 pb-4">
          {/* Button A */}
          <button
            onClick={handleButtonA}
            className="w-14 h-14 bg-pink-600 rounded-full border-4 border-pink-700 active:translate-y-1 active:shadow-inner shadow-lg flex items-center justify-center group"
          >
            <div className="w-10 h-10 bg-pink-700 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
          </button>

          {/* Button B */}
          <button
            onClick={handleButtonB}
            className="w-14 h-14 bg-pink-600 rounded-full border-4 border-pink-700 active:translate-y-1 active:shadow-inner shadow-lg flex items-center justify-center"
          >
            <div className="w-10 h-10 bg-pink-700 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
          </button>

          {/* Button C */}
          <button
            onClick={handleButtonC}
            className="w-14 h-14 bg-pink-600 rounded-full border-4 border-pink-700 active:translate-y-1 active:shadow-inner shadow-lg flex items-center justify-center"
          >
            <div className="w-10 h-10 bg-pink-700 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
          </button>
        </div>

        {/* Button Labels */}
        <div className="flex justify-between w-full px-6 -mt-2 text-[8px] text-pink-400 font-bold">
          <span>SELECT</span>
          <span>OK</span>
          <span>BACK</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-xs text-center space-y-2 opacity-70">
        <p className="text-[10px] leading-relaxed">
          [A] 切换菜单 | [B] 确认动作 | [C] 取消/返回
        </p>
        <p className="text-[8px]">
          点击 [GEN] 图标通过 AI 进化你的宠物！
        </p>
      </div>
    </div>
  );
}