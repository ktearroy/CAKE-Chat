import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, Users, UserCircle, Smile, Palette, Settings, 
  ChevronLeft, ChevronDown, ChevronRight, Send, Plus, Image as ImageIcon, Trash2, X, Book, Compass, Search,
  Save, Download, Upload, AlertTriangle, Camera, MapPin, Eye, AtSign,
  Wallet, CreditCard, FileText, QrCode, Edit3, Check, TrendingUp, FolderPlus, Heart, MoreHorizontal, PlusCircle,
  Briefcase, ShoppingBag, Plane, Twitter, Droplets, Calendar, RefreshCw
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import TamagotchiApp from './TamagotchiApp';
import PeriodApp from './PeriodApp';

// --- Types ---

type Screen = 'home' | 'chat_list' | 'chat' | 'characters' | 'self' | 'stickers' | 'themes' | 'settings' | 'worldbook' | 'jump' | 'work' | 'xianyu' | 'twitter' | 'period' | 'calendar' | 'backpack' | 'tamagotchi';

interface WorldbookEntry {
  id: string;
  title: string;
  content: string;
  type: 'global' | 'specific';
  characterIds: string[];
}

interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  avatar?: string;
  group?: string;
  age?: number;
}

interface SelfProfile {
  name: string;
  description: string;
  avatar?: string;
  wechatId?: string;
  status?: string;
  statusEmoji?: string;
  balance?: number;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text?: string;
  sticker?: string;
  timestamp: number;
}

interface BankCard {
  id: string;
  number: string;
  bankName: string;
  remark: string;
  balance: number;
}

interface Moment {
  id: string;
  authorId: string; // 'self' or character id
  content: string;
  images?: string[];
  timestamp: number;
  location?: string;
  mentions?: string[]; // character ids
  visibility?: 'public' | 'private' | 'friends' | 'groups';
  visibleGroups?: string[]; // group names
  likes?: string[]; // character ids
  comments?: { id: string; authorId: string; content: string; timestamp: number; replyToId?: string; replyToAuthorName?: string; }[];
}

interface Item {
  id: string;
  name: string;
  emoji: string;
  type: 'food' | 'toy' | 'household' | 'special';
  rarity: 'common' | 'rare' | 'epic';
}

type AppId = 'chat_list' | 'characters' | 'self' | 'worldbook' | 'stickers' | 'themes' | 'settings' | 'jump' | 'work' | 'xianyu' | 'twitter' | 'period' | 'calendar' | 'backpack' | 'tamagotchi';

const APPS: Record<AppId, { icon: React.ReactElement, label: string, color: string, screen: Screen }> = {
  chat_list: { icon: <MessageCircle />, label: '信息', color: 'bg-green-500', screen: 'chat_list' },
  characters: { icon: <Users />, label: '角色', color: 'bg-blue-500', screen: 'characters' },
  self: { icon: <UserCircle />, label: '我的', color: 'bg-purple-500', screen: 'self' },
  worldbook: { icon: <Book />, label: '世界书', color: 'bg-amber-600', screen: 'worldbook' },
  stickers: { icon: <Smile />, label: '贴纸', color: 'bg-yellow-500', screen: 'stickers' },
  themes: { icon: <Palette />, label: '主题', color: 'bg-pink-500', screen: 'themes' },
  settings: { icon: <Settings />, label: '设置', color: 'bg-gray-500', screen: 'settings' },
  jump: { icon: <TrendingUp />, label: '跃迁', color: 'bg-red-500', screen: 'jump' },
  work: { icon: <Briefcase />, label: '打工', color: 'bg-orange-500', screen: 'work' },
  xianyu: { icon: <ShoppingBag />, label: '闲鱼', color: 'bg-emerald-500', screen: 'xianyu' },
  twitter: { icon: <Twitter />, label: 'X', color: 'bg-black', screen: 'twitter' },
  period: { icon: <Droplets />, label: '经期', color: 'bg-rose-500', screen: 'period' },
  calendar: { icon: <Calendar />, label: '日历', color: 'bg-blue-600', screen: 'calendar' },
  backpack: { icon: <ShoppingBag />, label: '背包', color: 'bg-amber-800', screen: 'backpack' },
  tamagotchi: { icon: <Heart />, label: '拓麻歌子', color: 'bg-pink-400', screen: 'tamagotchi' },
};

const defaultLayout: { desktop: (AppId | null)[][], dock: AppId[] } = {
  desktop: [
    [
      'worldbook', 'stickers', 'themes', 'settings', 'jump',
      'work', 'xianyu', 'twitter', 'period', 'calendar', 'backpack', 'tamagotchi',
      null, null, null
    ]
  ],
  dock: ['chat_list', 'characters', 'self']
};

interface Pet {
  name: string;
  hunger: number;
  cleanliness: number;
  happiness: number;
  adoptedCharacterId: string | null;
}

interface PhoneData {
  wallpaper: string | null;
  characters: Character[];
  selfProfile: SelfProfile;
  pet: Pet | null;
  stickers: string[];
  worldbooks: WorldbookEntry[];
  messages: Record<string, Message[]>;
  moments?: Moment[];
  momentsBg?: string | null;
  bankCards?: BankCard[];
  backpackItems: Item[];
  xPosts?: {
    id: string;
    authorName: string;
    authorHandle: string;
    avatar?: string;
    content: string;
    timestamp: number;
    likes: number;
    retweets: number;
    comments: number;
  }[];
  layout?: {
    desktop: (AppId | null)[][];
    dock: AppId[];
  };
  settings: {
    apiUrl?: string;
    apiKey?: string;
    model: string;
    temperature?: number;
    apiPresets?: { name: string, apiUrl?: string, apiKey?: string, model: string, temperature?: number }[];
    notifications?: {
      popups: boolean;
      keepAlive: boolean;
    };
  };
}

const DEFAULT_DATA: PhoneData = {
  wallpaper: null,
  characters: [
    {
      id: '1',
      name: 'AI 助手',
      description: '一个乐于助人且礼貌的 AI 助手。',
      personality: '总是乐于助人，简洁且友好。'
    }
  ],
  selfProfile: {
    name: '',
    description: '',
    balance: 1000.00
  },
  pet: null,
  stickers: [],
  worldbooks: [],
  messages: {
    '1': [] // Default AI Assistant starts in the chat list
  },
  moments: [],
  momentsBg: null,
  bankCards: [],
  backpackItems: [],
  xPosts: [
    {
      id: '1',
      authorName: 'AI小助手',
      authorHandle: '@ai_assistant',
      avatar: '',
      content: '欢迎来到 X 页面，这里支持实时动态。',
      timestamp: Date.now() - 1000 * 60 * 20,
      likes: 12,
      retweets: 3,
      comments: 2,
    },
    {
      id: '2',
      authorName: '开发者',
      authorHandle: '@dev',
      avatar: '',
      content: '现在已经实现了 X 界面 UI，并且本地存储数据持久化。',
      timestamp: Date.now() - 1000 * 60 * 5,
      likes: 34,
      retweets: 9,
      comments: 5,
    }
  ],
  layout: defaultLayout,
  settings: {
    model: 'gemini-3.1-flash-preview',
    temperature: 1,
    apiPresets: [],
    notifications: {
      popups: true,
      keepAlive: true
    }
  }
};

const LIFE_STAGES = [
  { age: 5, label: '儿时', range: '0-12岁' },
  { age: 15, label: '少年', range: '13-18岁' },
  { age: 25, label: '青年', range: '19-35岁' },
  { age: 40, label: '中年', range: '36-60岁' },
  { age: 65, label: '老年', range: '60岁以上' },
];

// --- Main App ---

export default function App() {
  // Data persistence functions
  const loadData = () => {
    const saved = localStorage.getItem('phoneData');
    return saved ? JSON.parse(saved) : DEFAULT_DATA;
  };

  const [data, setData] = useState<PhoneData>(loadData);

  // Data persistence functions
  const saveData = () => {
    localStorage.setItem('phoneData', JSON.stringify(data));
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [messagesTab, setMessagesTab] = useState<'messages' | 'contacts' | 'moments' | 'me'>('messages');
  const [contactSearch, setContactSearch] = useState('');
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactDesc, setEditContactDesc] = useState('');
  const [editContactPers, setEditContactPers] = useState('');
  const [editContactGroup, setEditContactGroup] = useState('');
  const [editContactAvatar, setEditContactAvatar] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showMeStickers, setShowMeStickers] = useState(false);
  const [showBankCards, setShowBankCards] = useState(false);
  const [showAddBankCard, setShowAddBankCard] = useState(false);
  const [newBankCardNumber, setNewBankCardNumber] = useState('');
  const [newBankCardBankName, setNewBankCardBankName] = useState('');
  const [newBankCardRemark, setNewBankCardRemark] = useState('');
  const [selectedBankCardId, setSelectedBankCardId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // New chat menu state
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [twitterTab, setTwitterTab] = useState<'forYou' | 'following'>('forYou');
  const [twitterDraft, setTwitterDraft] = useState('');
  const [selectedJumpCharacterId, setSelectedJumpCharacterId] = useState<string | null>(null);
  const [jumpChat, setJumpChat] = useState<{ characterId: string, stage: string } | null>(null);
  const [jumpChatMessages, setJumpChatMessages] = useState<{ sender: 'user' | 'character' | 'narration', text: string }[]>([]);
  const [jumpChatInput, setJumpChatInput] = useState('');
  const [showSingleSelect, setShowSingleSelect] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Moments state
  const [showNewMoment, setShowNewMoment] = useState(false);
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [activeCommentMomentId, setActiveCommentMomentId] = useState<string | null>(null);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToAuthorName, setReplyToAuthorName] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [newMomentContent, setNewMomentContent] = useState('');
  const [newMomentImages, setNewMomentImages] = useState<string[]>([]);
  const [newMomentLocation, setNewMomentLocation] = useState('');
  const [newMomentMentions, setNewMomentMentions] = useState<string[]>([]);
  const [newMomentVisibility, setNewMomentVisibility] = useState<'public' | 'private' | 'friends' | 'groups'>('public');
  const [showMentionsSelect, setShowMentionsSelect] = useState(false);
  const [showVisibilitySelect, setShowVisibilitySelect] = useState(false);
  const [newMomentVisibleGroups, setNewMomentVisibleGroups] = useState<string[]>([]);

  // Contacts tab state
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState<string[]>([]);

  // Me tab state
  const [editingMeField, setEditingMeField] = useState<'name' | 'wechatId' | 'status' | null>(null);
  const [editMeValue, setEditMeValue] = useState('');
  const [editMeEmoji, setEditMeEmoji] = useState('😊');
  const [showWallet, setShowWallet] = useState(false);
  const [walletAction, setWalletAction] = useState<'recharge' | 'withdraw' | null>(null);
  const [walletAmount, setWalletAmount] = useState('');

  // Home screen layout & edit state
  const [isEditingApps, setIsEditingApps] = useState(false);
  const [draggedApp, setDraggedApp] = useState<AppId | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressFired = useRef(false);
  const pointerStartPos = useRef<{x: number, y: number} | null>(null);
  const edgeTimer = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Save data to localStorage whenever data changes
  useEffect(() => {
    saveData();
  }, [data]);

  useEffect(() => {
    if (!isEditingApps) {
      const maxPage = Math.max(0, (data.layout?.desktop.length || 1) - 1);
      if (currentPage > maxPage) {
        setCurrentPage(maxPage);
      }
    }
  }, [isEditingApps, data.layout?.desktop.length, currentPage]);

  const handlePointerDown = (e: React.PointerEvent) => {
    longPressFired.current = false;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setIsEditingApps(true);
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartPos.current && pressTimer.current) {
      const dx = e.clientX - pointerStartPos.current.x;
      const dy = e.clientY - pointerStartPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    }
  };

  const handlePointerUpOrLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setTimeout(() => {
      longPressFired.current = false;
    }, 200);
  };

  const handleDragStart = (e: React.DragEvent, id: AppId) => {
    setDraggedApp(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEdgeHover = (direction: 'left' | 'right') => {
    if (!edgeTimer.current) {
      edgeTimer.current = setTimeout(() => {
        setCurrentPage(prev => {
          if (direction === 'left' && prev > 0) return prev - 1;
          if (direction === 'right') {
            const maxPage = dataRef.current.layout?.desktop.length || 1;
            if (prev < maxPage) return prev + 1;
            return prev;
          }
          return prev;
        });
        edgeTimer.current = null;
      }, 800);
    }
  };

  const clearEdgeHover = () => {
    if (edgeTimer.current) {
      clearTimeout(edgeTimer.current);
      edgeTimer.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent, targetList: 'desktop' | 'dock', targetIndex?: number, targetPage?: number) => {
    e.preventDefault();
    e.stopPropagation();
    clearEdgeHover();
    if (!draggedApp) return;

    let finalDesktopLength = 0;

    setData(prev => {
      const layout = prev.layout || defaultLayout;
      let newDesktop = layout.desktop.map(page => {
        const newPage = [...page].slice(0, 16);
        while (newPage.length < 16) newPage.push(null);
        return newPage;
      });
      let newDock = [...layout.dock];

      let sourceList: 'desktop' | 'dock' | null = null;
      let sourcePage = -1;
      let sourceIndex = -1;

      newDesktop.forEach((page, pIdx) => {
        const idx = page.indexOf(draggedApp);
        if (idx !== -1) {
          sourceList = 'desktop';
          sourcePage = pIdx;
          sourceIndex = idx;
          page[idx] = null;
        }
      });

      const dockIdx = newDock.indexOf(draggedApp as AppId);
      if (dockIdx !== -1) {
        sourceList = 'dock';
        sourceIndex = dockIdx;
        newDock.splice(dockIdx, 1);
      }

      const pageIndex = targetPage !== undefined ? targetPage : currentPage;

      if (targetList === 'desktop') {
        while (newDesktop.length <= pageIndex) {
          newDesktop.push(Array(16).fill(null));
        }

        if (targetIndex !== undefined) {
          const existingApp = newDesktop[pageIndex][targetIndex];
          newDesktop[pageIndex][targetIndex] = draggedApp as AppId;

          if (existingApp) {
            if (sourceList === 'desktop') {
              newDesktop[sourcePage][sourceIndex] = existingApp;
            } else if (sourceList === 'dock') {
              newDock.splice(sourceIndex, 0, existingApp);
            } else {
              const emptyIdx = newDesktop[pageIndex].indexOf(null);
              if (emptyIdx !== -1) {
                newDesktop[pageIndex][emptyIdx] = existingApp;
              } else {
                const newPage = Array(16).fill(null);
                newPage[0] = existingApp;
                newDesktop.push(newPage);
              }
            }
          }
        } else {
          if (sourceList === 'desktop' && sourcePage === pageIndex) {
            newDesktop[sourcePage][sourceIndex] = draggedApp as AppId;
          } else {
            const emptyIdx = newDesktop[pageIndex].indexOf(null);
            if (emptyIdx !== -1) {
              newDesktop[pageIndex][emptyIdx] = draggedApp as AppId;
            } else {
              const newPage = Array(16).fill(null);
              newPage[0] = draggedApp as AppId;
              newDesktop.push(newPage);
            }
          }
        }
      } else {
        if (targetIndex !== undefined) {
          newDock.splice(targetIndex, 0, draggedApp as AppId);
        } else {
          newDock.push(draggedApp as AppId);
        }

        if (newDock.length > 4) {
          const bumped = newDock.pop()!;
          let placed = false;
          for (let i = 0; i < newDesktop.length; i++) {
            const emptyIdx = newDesktop[i].indexOf(null);
            if (emptyIdx !== -1) {
              newDesktop[i][emptyIdx] = bumped;
              placed = true;
              break;
            }
          }
          if (!placed) {
            const newPage = Array(16).fill(null);
            newPage[0] = bumped;
            newDesktop.push(newPage);
          }
        }
      }

      while (newDesktop.length > 1) {
        const lastPage = newDesktop[newDesktop.length - 1];
        if (lastPage.every(app => app === null)) {
          newDesktop.pop();
        } else {
          break;
        }
      }

      finalDesktopLength = newDesktop.length;
      return { ...prev, layout: { desktop: newDesktop, dock: newDock } };
    });
    
    setDraggedApp(null);
    setTimeout(() => {
      setCurrentPage(curr => {
        const maxPage = Math.max(0, finalDesktopLength - 1);
        return curr > maxPage ? maxPage : curr;
      });
    }, 0);
  };

  // Character form state
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharPers, setNewCharPers] = useState('');
  const [newCharAvatar, setNewCharAvatar] = useState<string | null>(null);

  // Worldbook form state
  const [newWbTitle, setNewWbTitle] = useState('');
  const [newWbContent, setNewWbContent] = useState('');
  const [newWbType, setNewWbType] = useState<'global' | 'specific'>('global');
  const [newWbCharIds, setNewWbCharIds] = useState<string[]>([]);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Theme settings state
  const [expandedThemeCategory, setExpandedThemeCategory] = useState<string | null>(null);
  
  // Settings state
  const [expandedSettingsCategory, setExpandedSettingsCategory] = useState<string | null>('api');
  const [presetName, setPresetName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load data on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_phone_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  }, []);

  // Expose function for TamagotchiApp to add items
  useEffect(() => {
    (window as any).updateBackpackItems = (item: Item) => {
      setData(prev => {
        const newBackpackItems = [...(prev.backpackItems || []), item];
        return { ...prev, backpackItems: newBackpackItems };
      });
    };
    return () => {
      delete (window as any).updateBackpackItems;
    };
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem('ai_phone_data', JSON.stringify(data));
  }, [data]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (currentScreen === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data.messages, isTyping, currentScreen, showStickers]);

  // --- Handlers ---

  const fetchModels = async (): Promise<boolean> => {
    try {
      setIsFetchingModels(true);
      // Use local dev proxy by default to avoid CORS issues in browser
      // (Vite dev server will proxy /genai/* to the real API)
      let url = data.settings.apiUrl || '/genai';
      url = url.replace(/\/$/, '');
      const key = data.settings.apiKey || process.env.GEMINI_API_KEY;

      // Try OpenAI format first
      try {
        const res = await fetch(`${url}/v1/models`, {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (res.ok) {
          const json = await res.json();
          const models = json.data.map((m: any) => m.id);
          setAvailableModels(models);
          if (models.length > 0 && !models.includes(data.settings.model)) {
            setData(prev => ({...prev, settings: {...prev.settings, model: models[0]}}));
          }
          setIsFetchingModels(false);
          return true;
        }
      } catch (e) {
        // ignore and try gemini format
      }

      // Try Gemini format
      const res = await fetch(`${url}/v1beta/models?key=${key}`);
      if (res.ok) {
        const json = await res.json();
        const models = json.models.map((m: any) => m.name.replace('models/', ''));
        setAvailableModels(models);
        if (models.length > 0 && !models.includes(data.settings.model)) {
          setData(prev => ({...prev, settings: {...prev.settings, model: models[0]}}));
        }
        setIsFetchingModels(false);
        return true;
      }

      showToast('Failed to fetch models. Check your API URL and Key.');
      return false;
    } catch (e) {
      console.error(e);
      showToast('Error fetching models. Check console.');
      return false;
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (dataUrl: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (text: string, stickerUrl?: string) => {
    if (!activeChat) return;
    if (!text.trim() && !stickerUrl) return;

    const character = data.characters.find(c => c.id === activeChat);
    if (!character) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      sticker: stickerUrl,
      timestamp: Date.now()
    };

    const updatedMessages = {
      ...data.messages,
      [activeChat]: [...(data.messages[activeChat] || []), newMessage]
    };

    setData(prev => ({ ...prev, messages: updatedMessages }));
    setInputText('');
    setShowStickers(false);
    setIsTyping(true);

    try {
      const apiKey = data.settings.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      const aiConfig: any = { apiKey };
      if (data.settings.apiUrl) {
        aiConfig.httpOptions = { baseUrl: data.settings.apiUrl };
      }
      const ai = new GoogleGenAI(aiConfig);
      
      const applicableWorldbooks = (data.worldbooks || []).filter(wb => 
        wb.type === 'global' || (wb.type === 'specific' && wb.characterIds.includes(activeChat))
      );

      let worldbookContext = '';
      if (applicableWorldbooks.length > 0) {
        worldbookContext = `\n\n[世界设定/背景知识 (Worldbook)]\n` + 
          applicableWorldbooks.map(wb => `--- ${wb.title} ---\n${wb.content}`).join('\n\n') + 
          `\n[以上是世界设定，请在回复时遵循这些设定。]\n`;
      }
      
      const systemInstruction = `You are playing the role of a character named ${character.name}.
Description: ${character.description}
Personality: ${character.personality}

You are chatting with a user named ${data.selfProfile.name || 'User'}.
User Description: ${data.selfProfile.description || 'No description provided.'}
User's Current Status/Mood: ${data.selfProfile.statusEmoji || ''} ${data.selfProfile.status || 'Not specified.'}${worldbookContext}

Respond in character. Keep responses concise like text messages.`;

      // Format history for Gemini
      const contents = updatedMessages[activeChat].map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text || (msg.sticker ? '[Sent a sticker]' : '') }]
      }));

      const response = await ai.models.generateContent({
        model: data.settings.model || 'gemini-3.1-flash-preview',
        contents: contents,
        config: {
          systemInstruction,
        }
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now()
      };

      setData(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [activeChat]: [...(prev.messages[activeChat] || []), aiMessage]
        }
      }));

    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I'm having trouble connecting right now.",
        timestamp: Date.now()
      };
      setData(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [activeChat]: [...(prev.messages[activeChat] || []), errorMessage]
        }
      }));
    } finally {
      setIsTyping(false);
    }
  };

  // --- Renderers ---

  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const ScreenHeader = ({ title, onBack, rightNode }: { title: string, onBack: () => void, rightNode?: React.ReactNode }) => (
    <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-zinc-900/80 backdrop-blur-md text-white sticky top-0 z-20 border-b border-white/5">
      <div className="flex items-center">
        <button onClick={onBack} className="p-1 -ml-1 mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {rightNode && <div>{rightNode}</div>}
    </div>
  );

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const maxPage = Math.max(0, (data.layout?.desktop.length || 1) - 1);

    if (isLeftSwipe && currentPage < maxPage) {
      setCurrentPage(prev => prev + 1);
    }
    if (isRightSwipe && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const renderHome = () => {
    const layout = data.layout || defaultLayout;
    const pages = layout.desktop;

    return (
      <motion.div 
        key="home"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 z-10"
        onClick={() => {
          if (longPressFired.current) {
            return;
          }
          if (isEditingApps) setIsEditingApps(false);
        }}
      >
        {isEditingApps && (
          <div className="absolute top-10 right-6 z-20">
            <button onClick={(e) => { e.stopPropagation(); setIsEditingApps(false); }} className="bg-white/30 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">完成</button>
          </div>
        )}

        {isEditingApps && currentPage > 0 && (
          <div 
            className="absolute left-0 top-0 bottom-32 w-12 z-30"
            onDragOver={(e) => {
              e.preventDefault();
              handleEdgeHover('left');
            }}
            onDragLeave={clearEdgeHover}
            onDrop={(e) => handleDrop(e, 'desktop', undefined, currentPage - 1)}
          />
        )}
        {isEditingApps && (
          <div 
            className="absolute right-0 top-0 bottom-32 w-12 z-30"
            onDragOver={(e) => {
              e.preventDefault();
              handleEdgeHover('right');
            }}
            onDragLeave={clearEdgeHover}
            onDrop={(e) => handleDrop(e, 'desktop', undefined, currentPage + 1)}
          />
        )}

        <div 
          className="absolute inset-0 pt-20 pb-[120px] px-6 z-0 overflow-hidden"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => handleDrop(e, 'desktop', undefined, currentPage)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          onPointerCancel={handlePointerUpOrLeave}
        >
          <motion.div 
            className="flex h-full w-full"
            animate={{ x: `calc(-${currentPage * 100}% - ${currentPage * 1.5}rem)` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ gap: '1.5rem' }}
            drag={!isEditingApps ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.x + velocity.x * 0.2;
              const swipeThreshold = 50;
              const maxPage = Math.max(0, (data.layout?.desktop.length || 1) - 1);

              if (swipe < -swipeThreshold && currentPage < maxPage) {
                setCurrentPage(prev => prev + 1);
              } else if (swipe > swipeThreshold && currentPage > 0) {
                setCurrentPage(prev => prev - 1);
              }
            }}
          >
            {Array.from({ length: Math.max(pages.length, currentPage + 1) }).map((_, pageIndex) => {
              const pageApps = pages[pageIndex] || [];
              return (
                <div key={pageIndex} className="w-full h-full shrink-0 grid grid-cols-4 grid-rows-[repeat(4,min-content)] gap-y-8 gap-x-4 content-start">
                  {Array.from({ length: 16 }).map((_, index) => {
                    const appId = pageApps[index];
                    const app = appId ? APPS[appId] : null;

                    return (
                      <div 
                        key={index} 
                        className="w-full h-[88px] flex flex-col items-center justify-start relative"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleDrop(e, 'desktop', index, pageIndex);
                        }}
                      >
                        {app && (
                          <AppIcon 
                            id={appId}
                            icon={app.icon}
                            label={app.label}
                            color={app.color}
                            onClick={() => setCurrentScreen(app.screen)}
                            isEditing={isEditingApps}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUpOrLeave}
                            onPointerLeave={handlePointerUpOrLeave}
                            draggable={isEditingApps}
                            onDragStart={(e: any) => handleDragStart(e, appId)}
                            onDragOver={(e: any) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e: any) => {
                              e.stopPropagation();
                              handleDrop(e, 'desktop', index, pageIndex);
                            }}
                          />
                        )}
                        {isEditingApps && !app && index < 12 && (
                          <div className="w-[60px] h-[60px] border-2 border-dashed border-white/20 rounded-[20px] pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        </div>

        {Math.max(pages.length, currentPage + 1) > 1 && (
          <div className="absolute bottom-[130px] inset-x-0 flex justify-center gap-2 z-10">
            {Array.from({ length: Math.max(pages.length, currentPage + 1) }).map((_, i) => (
              <button 
                key={i} 
                onClick={(e) => { e.stopPropagation(); setCurrentPage(i); }}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentPage ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}

        {/* Siri Sphere */}
        <motion.div
          className="absolute bottom-[160px] left-1/2 -translate-x-1/2 z-20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg flex items-center justify-center cursor-pointer" onClick={() => showToast("Siri 启动中...")}>
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm" />
          </div>
        </motion.div>

        <div 
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 h-[88px] min-w-[88px] rounded-[32px] flex items-center justify-center gap-4 px-4 z-10 border shadow-lg transition-all duration-300 ${layout.dock.length === 0 && !draggedApp ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
          style={{
            background: 'var(--kawaii-brown-light,#C6A8A1)',
            borderColor: 'var(--kawaii-brown,#9C7C72)',
            boxShadow: '0 2px 12px 0 rgba(156,124,114,0.10)'
          }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => handleDrop(e, 'dock')}
          onClick={(e) => e.stopPropagation()}
        >
          {layout.dock.map((appId, index) => {
            const app = APPS[appId];
            if (!app) return null;
            return (
              <AppIcon 
                key={appId}
                id={appId}
                icon={app.icon}
                label={app.label}
                color={app.color}
                onClick={() => setCurrentScreen(app.screen)}
                isEditing={isEditingApps}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrLeave}
                onPointerLeave={handlePointerUpOrLeave}
                draggable={isEditingApps}
                onDragStart={(e: any) => handleDragStart(e, appId)}
                onDragOver={(e: any) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e: any) => handleDrop(e, 'dock', index)}
                hideLabel={true}
              />
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderChatList = () => {
    const rightNode = messagesTab === 'messages' ? (
      <div className="relative">
        <button onClick={() => setShowNewChatMenu(!showNewChatMenu)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
          <Plus size={24} />
        </button>
        {showNewChatMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNewChatMenu(false)}></div>
            <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-800 rounded-xl shadow-lg border border-white/10 overflow-hidden z-50">
              <button onClick={() => { setShowNewChatMenu(false); setShowSingleSelect(true); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 transition-colors">单聊</button>
              <button onClick={() => { setShowNewChatMenu(false); showToast('群聊功能即将推出！'); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 transition-colors border-t border-white/5">群聊</button>
            </div>
          </>
        )}
      </div>
    ) : messagesTab === 'moments' ? (
      <button onClick={() => setShowNewMoment(true)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
        <Camera size={24} />
      </button>
    ) : undefined;

    const activeChats = data.characters.filter(c => data.messages[c.id] !== undefined);

    const renderTabContent = () => {
      switch (messagesTab) {
        case 'messages':
          return (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeChats.length === 0 ? (
                <p className="text-zinc-500 text-center mt-10">暂无消息。点击 + 开始聊天。</p>
              ) : (
                activeChats.map(c => {
                  const lastMsg = data.messages[c.id]?.slice(-1)[0];
                  return (
                    <div key={c.id} onClick={() => { setActiveChat(c.id); setCurrentScreen('chat'); }} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                        {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} /> : c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{c.name}</h3>
                        <p className="text-zinc-400 text-sm truncate">
                          {lastMsg ? (lastMsg.text || '发送了一个贴纸') : '暂无消息'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        case 'contacts': {
          const filteredContacts = data.characters.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()));
          
          const groupedContacts = filteredContacts.reduce((acc, c) => {
            const group = c.group || '未分组';
            if (!acc[group]) acc[group] = [];
            acc[group].push(c);
            return acc;
          }, {} as Record<string, Character[]>);

          const sortedGroups = Object.keys(groupedContacts).sort((a, b) => {
            if (a === '未分组') return 1;
            if (b === '未分组') return -1;
            return a.localeCompare(b);
          });

          return (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Search Bar & Group Button */}
              <div className="p-3 bg-zinc-950 sticky top-0 z-10 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="搜索" 
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full bg-zinc-900 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                  />
                </div>
                <button 
                  onClick={() => {
                    setNewGroupName('');
                    setSelectedContactsForGroup([]);
                    setShowGroupManager(true);
                  }}
                  className="bg-zinc-900 text-zinc-400 hover:text-white px-3 rounded-lg flex items-center justify-center transition-colors"
                >
                  <FolderPlus size={18} />
                </button>
              </div>

              {/* Contacts List */}
              <div className="flex-1 pb-4">
                {sortedGroups.map(group => (
                  <div key={group}>
                    <div className="px-4 py-1 bg-zinc-900/50 text-zinc-400 text-xs font-medium sticky top-[52px] z-10 backdrop-blur-md">
                      {group}
                    </div>
                    <div className="px-3">
                      {groupedContacts[group].map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-2xl my-1 border border-transparent hover:border-white/5 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                            {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} /> : c.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">{c.name}</h3>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingContactId(c.id);
                              setEditContactName(c.name);
                              setEditContactDesc(c.description);
                              setEditContactPers(c.personality);
                              setEditContactGroup(c.group || '');
                              setEditContactAvatar(c.avatar || null);
                            }}
                            className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors shrink-0"
                          >
                            编辑
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-zinc-500 text-center mt-10">暂无联系人</p>
                )}
              </div>
            </div>
          );
        }
        case 'moments':
          return (
            <div className="flex-1 overflow-y-auto bg-zinc-950 relative">
              {/* Header Background */}
              <div className="relative h-64 bg-zinc-800">
                {data.momentsBg ? (
                  <img src={data.momentsBg} alt="background" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-zinc-700 to-zinc-900" />
                )}
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                  <span className="text-white bg-black/50 px-3 py-1.5 rounded-full text-sm backdrop-blur-md">更换背景</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, url => setData(prev => ({...prev, momentsBg: url})))} />
                </label>
                
                {/* User Info */}
                <div className="absolute -bottom-6 right-4 flex items-end gap-4">
                  <span className="text-white font-bold text-lg drop-shadow-md mb-2">{data.selfProfile.name || '我'}</span>
                  <div className="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-zinc-950 overflow-hidden shrink-0">
                    {data.selfProfile.avatar ? (
                      <img src={data.selfProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">我</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Moments List */}
              <div className="pt-12 pb-20 px-4 space-y-8">
                {(data.moments || []).length === 0 ? (
                  <div className="text-center text-zinc-500 mt-10">暂无动态，点击右上角发布</div>
                ) : (
                  [...(data.moments || [])].sort((a, b) => b.timestamp - a.timestamp).map(moment => {
                    const isSelf = moment.authorId === 'self';
                    const author = isSelf ? data.selfProfile : data.characters.find(c => c.id === moment.authorId);
                    const authorName = isSelf ? (data.selfProfile.name || '我') : (author?.name || '未知');
                    const authorAvatar = isSelf ? data.selfProfile.avatar : author?.avatar;

                    return (
                      <div key={moment.id} className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                          {authorAvatar ? (
                            <img src={authorAvatar} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">{authorName[0]}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-blue-400 font-medium mb-1">{authorName}</div>
                          <div className="text-white text-[15px] leading-relaxed mb-2 whitespace-pre-wrap">{moment.content}</div>
                          
                          {/* Images Grid */}
                          {moment.images && moment.images.length > 0 && (
                            <div className={`grid gap-1 mb-2 ${moment.images.length === 1 ? 'grid-cols-1 w-2/3' : moment.images.length === 2 || moment.images.length === 4 ? 'grid-cols-2 w-2/3' : 'grid-cols-3'}`}>
                              {moment.images.map((img, idx) => (
                                <div key={idx} className="aspect-square bg-zinc-800 overflow-hidden">
                                  <img src={img} alt="moment image" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Location & Mentions */}
                          {(moment.location || (moment.mentions && moment.mentions.length > 0)) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs text-blue-400/80">
                              {moment.location && <span className="flex items-center gap-0.5"><MapPin size={12} /> {moment.location}</span>}
                              {moment.mentions && moment.mentions.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <AtSign size={12} /> 
                                  {moment.mentions.map(id => data.characters.find(c => c.id === id)?.name).filter(Boolean).join(', ')}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
                            <span>{new Date(moment.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <div className="flex items-center gap-2">
                              {isSelf && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingMomentId(moment.id);
                                      setNewMomentContent(moment.content);
                                      setNewMomentImages(moment.images || []);
                                      setNewMomentLocation(moment.location || '');
                                      setNewMomentMentions(moment.mentions || []);
                                      setNewMomentVisibility(moment.visibility || 'public');
                                      setNewMomentVisibleGroups(moment.visibleGroups || []);
                                      setShowNewMoment(true);
                                    }}
                                    className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors text-zinc-400"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const momentId = moment.id;
                                      setData(prev => {
                                        const filteredMoments = (prev.moments || []).filter(m => m.id !== momentId);
                                        return { ...prev, moments: filteredMoments };
                                      });
                                    }}
                                    className="p-1.5 bg-zinc-800 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors text-zinc-400"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => {
                                  setData(prev => {
                                    const newMoments = prev.moments.map(m => {
                                      if (m.id === moment.id) {
                                        const likes = m.likes || [];
                                        const isLiked = likes.includes('self');
                                        return { ...m, likes: isLiked ? likes.filter(id => id !== 'self') : [...likes, 'self'] };
                                      }
                                      return m;
                                    });
                                    return { ...prev, moments: newMoments };
                                  });
                                }}
                                className={`p-1.5 rounded flex items-center gap-1 transition-colors ${moment.likes?.includes('self') ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                              >
                                <Heart size={14} className={moment.likes?.includes('self') ? 'fill-current' : ''} />
                              </button>
                              <button 
                                onClick={() => setActiveCommentMomentId(activeCommentMomentId === moment.id ? null : moment.id)}
                                className="p-1.5 bg-zinc-800 rounded flex items-center gap-1 hover:bg-zinc-700 transition-colors text-zinc-400"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Likes & Comments Display */}
                          {(moment.likes?.length || moment.comments?.length) ? (
                            <div className="mt-3 bg-zinc-800/50 rounded-lg p-2.5 text-sm space-y-2">
                              {moment.likes && moment.likes.length > 0 && (
                                <div className="flex items-start gap-2 text-blue-400/90">
                                  <Heart size={14} className="mt-0.5 shrink-0" />
                                  <div className="flex-1 flex flex-wrap gap-1">
                                    {moment.likes.map((id, idx) => {
                                      const likerName = id === 'self' ? (data.selfProfile.name || '我') : data.characters.find(c => c.id === id)?.name;
                                      return (
                                        <span key={id}>
                                          {likerName}{idx < moment.likes!.length - 1 ? ', ' : ''}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {moment.likes?.length && moment.comments?.length ? (
                                <div className="h-px bg-white/5 w-full my-1"></div>
                              ) : null}

                              {moment.comments && moment.comments.length > 0 && (
                                <div className="space-y-1.5">
                                  {moment.comments.map(comment => {
                                    const commenterName = comment.authorId === 'self' ? (data.selfProfile.name || '我') : data.characters.find(c => c.id === comment.authorId)?.name;
                                    const isCommentSelf = comment.authorId === 'self';
                                    return (
                                      <div 
                                        key={comment.id} 
                                        className="text-zinc-300 group/comment relative hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
                                      >
                                        <div 
                                          className="cursor-pointer"
                                          onClick={() => {
                                            setActiveCommentMomentId(moment.id);
                                            setReplyToCommentId(comment.id);
                                            setReplyToAuthorName(commenterName || '未知');
                                            setCommentText('');
                                          }}
                                        >
                                          <span className="text-blue-400/90 font-medium">{commenterName}</span>
                                          {comment.replyToAuthorName && (
                                            <>
                                              <span className="mx-1 text-zinc-500 text-xs">回复</span>
                                              <span className="text-blue-400/90 font-medium">{comment.replyToAuthorName}</span>
                                            </>
                                          )}
                                          <span className="mx-1">:</span>
                                          <span className="break-words">{comment.content}</span>
                                        </div>
                                        {isCommentSelf && (
                                          <button 
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const mId = moment.id;
                                              const cId = comment.id;
                                              setData(prev => {
                                                const newMoments = (prev.moments || []).map(m => {
                                                  if (m.id === mId) {
                                                    const filteredComments = (m.comments || []).filter(c => c.id !== cId);
                                                    return { ...m, comments: filteredComments };
                                                  }
                                                  return m;
                                                });
                                                return { ...prev, moments: newMoments };
                                              });
                                            }}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : null}

                          {/* Comment Input */}
                          {activeCommentMomentId === moment.id && (
                            <div className="mt-3 flex flex-col gap-2">
                              {replyToAuthorName && (
                                <div className="flex items-center justify-between px-2 text-xs text-zinc-500">
                                  <span>回复 {replyToAuthorName}</span>
                                  <button onClick={() => { setReplyToCommentId(null); setReplyToAuthorName(null); }} className="text-zinc-400 hover:text-white">取消</button>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={commentText}
                                  onChange={e => setCommentText(e.target.value)}
                                  placeholder={replyToAuthorName ? `回复 ${replyToAuthorName}...` : "评论..."}
                                  className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && commentText.trim()) {
                                      setData(prev => {
                                        const newMoments = (prev.moments || []).map(m => {
                                          if (m.id === moment.id) {
                                            const comments = m.comments || [];
                                            return {
                                              ...m,
                                              comments: [...comments, { 
                                                id: Date.now().toString(), 
                                                authorId: 'self', 
                                                content: commentText.trim(), 
                                                timestamp: Date.now(),
                                                replyToId: replyToCommentId || undefined,
                                                replyToAuthorName: replyToAuthorName || undefined
                                              }]
                                            };
                                          }
                                          return m;
                                        });
                                        return { ...prev, moments: newMoments };
                                      });
                                      setCommentText('');
                                      setActiveCommentMomentId(null);
                                      setReplyToCommentId(null);
                                      setReplyToAuthorName(null);
                                    }
                                  }}
                                />
                                <button 
                                  onClick={() => {
                                    if (!commentText.trim()) return;
                                    setData(prev => {
                                      const newMoments = (prev.moments || []).map(m => {
                                        if (m.id === moment.id) {
                                          const comments = m.comments || [];
                                          return {
                                            ...m,
                                            comments: [...comments, { 
                                              id: Date.now().toString(), 
                                              authorId: 'self', 
                                              content: commentText.trim(), 
                                              timestamp: Date.now(),
                                              replyToId: replyToCommentId || undefined,
                                              replyToAuthorName: replyToAuthorName || undefined
                                            }]
                                          };
                                        }
                                        return m;
                                      });
                                      return { ...prev, moments: newMoments };
                                    });
                                    setCommentText('');
                                    setActiveCommentMomentId(null);
                                    setReplyToCommentId(null);
                                    setReplyToAuthorName(null);
                                  }}
                                  disabled={!commentText.trim()}
                                  className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                  发送
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        case 'me':
          return (
            <div className="flex-1 overflow-y-auto bg-zinc-950">
              {/* Profile Header */}
              <div className="bg-zinc-900 p-6 pt-8 mb-2 flex items-center gap-4">
                <label className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden shrink-0 cursor-pointer relative group">
                  {data.selfProfile.avatar ? (
                    <img src={data.selfProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">我</div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, url => setData(prev => ({ ...prev, selfProfile: { ...prev.selfProfile, avatar: url } })))} />
                </label>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-xl font-medium truncate">{data.selfProfile.name || '我'}</span>
                    <button onClick={() => { setEditingMeField('name'); setEditMeValue(data.selfProfile.name || ''); }} className="text-zinc-500 hover:text-zinc-300">
                      <Edit3 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                    <span>微信号：{data.selfProfile.wechatId || '未设置'}</span>
                    <button onClick={() => { setEditingMeField('wechatId'); setEditMeValue(data.selfProfile.wechatId || ''); }} className="text-zinc-500 hover:text-zinc-300">
                      <Edit3 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { 
                        setEditingMeField('status'); 
                        setEditMeValue(data.selfProfile.status || ''); 
                        setEditMeEmoji(data.selfProfile.statusEmoji || '😊');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                    >
                      {data.selfProfile.statusEmoji ? (
                        <span className="text-sm">{data.selfProfile.statusEmoji}</span>
                      ) : (
                        <Smile size={12} />
                      )}
                      <span>{data.selfProfile.statusEmoji ? '状态' : '+ 状态'}</span>
                    </button>
                  </div>
                </div>
                
                <div className="text-zinc-500 flex items-center gap-2">
                  <QrCode size={20} />
                  <ChevronRight size={20} />
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                <div className="bg-zinc-900">
                  <button onClick={() => setShowWallet(true)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Wallet size={24} className="text-green-500" />
                      <span className="text-white text-base">钱包</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-sm">¥{(data.selfProfile.balance || 0).toFixed(2)}</span>
                      <ChevronRight size={20} />
                    </div>
                  </button>
                </div>

                <div className="bg-zinc-900">
                  <button onClick={() => setShowBankCards(true)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <CreditCard size={24} className="text-blue-500" />
                      <span className="text-white text-base">银行卡</span>
                    </div>
                    <ChevronRight size={20} className="text-zinc-500" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <Users size={24} className="text-orange-500" />
                      <span className="text-white text-base">亲属卡</span>
                    </div>
                    <ChevronRight size={20} className="text-zinc-500" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={24} className="text-yellow-500" />
                      <span className="text-white text-base">账单</span>
                    </div>
                    <ChevronRight size={20} className="text-zinc-500" />
                  </button>
                </div>

                <div className="bg-zinc-900">
                  <button onClick={() => setShowMeStickers(true)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <Smile size={24} className="text-yellow-500" />
                      <span className="text-white text-base">表情包</span>
                    </div>
                    <ChevronRight size={20} className="text-zinc-500" />
                  </button>
                  <button onClick={() => setCurrentScreen('settings')} className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Settings size={24} className="text-blue-400" />
                      <span className="text-white text-base">设置</span>
                    </div>
                    <ChevronRight size={20} className="text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          );
      }
    };

    return (
      <motion.div key="chat_list" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
        <ScreenHeader 
          title={messagesTab === 'messages' ? '信息' : messagesTab === 'contacts' ? '通讯录' : messagesTab === 'moments' ? '朋友圈' : '我'} 
          onBack={() => setCurrentScreen('home')} 
          rightNode={rightNode} 
        />
        
        {renderTabContent()}

        {/* Bottom Navigation Bar */}
        <div className="flex items-center justify-around bg-zinc-900/90 backdrop-blur-md border-t border-white/5 pb-8 pt-2 px-2">
          <button onClick={() => setMessagesTab('messages')} className={`flex flex-col items-center p-2 ${messagesTab === 'messages' ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-400'} transition-colors`}>
            <MessageCircle size={24} className="mb-1" />
            <span className="text-[10px]">消息</span>
          </button>
          <button onClick={() => setMessagesTab('contacts')} className={`flex flex-col items-center p-2 ${messagesTab === 'contacts' ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-400'} transition-colors`}>
            <Users size={24} className="mb-1" />
            <span className="text-[10px]">通讯录</span>
          </button>
          <button onClick={() => setMessagesTab('moments')} className={`flex flex-col items-center p-2 ${messagesTab === 'moments' ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-400'} transition-colors`}>
            <Compass size={24} className="mb-1" />
            <span className="text-[10px]">朋友圈</span>
          </button>
          <button onClick={() => setMessagesTab('me')} className={`flex flex-col items-center p-2 ${messagesTab === 'me' ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-400'} transition-colors`}>
            <UserCircle size={24} className="mb-1" />
            <span className="text-[10px]">我</span>
          </button>
        </div>

        {/* Me Sub-screens */}
        {showMeStickers && (
          <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <ScreenHeader title="贴纸" onBack={() => setShowMeStickers(false)} />
            <div className="flex-1 overflow-y-auto p-4">
              <label className="flex items-center justify-center w-full h-24 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-colors mb-4">
                <div className="flex flex-col items-center text-zinc-400">
                  <Plus size={24} className="mb-1" />
                  <span className="text-sm">上传贴纸</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, url => setData(prev => ({...prev, stickers: [...prev.stickers, url]})))} />
              </label>
              
              <div className="grid grid-cols-3 gap-3">
                {data.stickers.map((s, i) => (
                  <div key={i} className="relative group aspect-square bg-zinc-900 rounded-xl p-2 border border-white/5">
                    <img src={s} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    <button onClick={() => setData(prev => ({...prev, stickers: prev.stickers.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showBankCards && (
          <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <ScreenHeader 
              title="银行卡" 
              onBack={() => setShowBankCards(false)} 
              rightNode={
                <button onClick={() => setShowAddBankCard(true)} className="p-2 text-green-500 hover:bg-white/5 rounded-full transition-colors">
                  <Plus size={24} />
                </button>
              }
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(data.bankCards || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-60">
                  <CreditCard size={64} className="mb-4" />
                  <p>暂无银行卡</p>
                  <button onClick={() => setShowAddBankCard(true)} className="mt-4 text-green-500 font-medium">点击添加</button>
                </div>
              ) : (
                (data.bankCards || []).map(card => (
                  <div key={card.id} className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-5 border border-white/5 shadow-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <CreditCard size={20} className="text-white" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">{card.bankName}</div>
                          <div className="text-zinc-400 text-xs">{card.remark || '储蓄卡'} | 余额: ¥{(card.balance || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setData(prev => ({ ...prev, bankCards: (prev.bankCards || []).filter(c => c.id !== card.id) }));
                        }}
                        className="p-2 text-zinc-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="text-white text-xl font-mono tracking-widest flex justify-between items-center">
                      <span>****</span>
                      <span>****</span>
                      <span>****</span>
                      <span>{card.number.slice(-4)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showAddBankCard && (
              <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-white font-semibold">添加银行卡</h3>
                    <button onClick={() => setShowAddBankCard(false)} className="text-zinc-400 hover:text-white p-1">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1 ml-1">银行名称</label>
                      <input 
                        type="text" 
                        value={newBankCardBankName}
                        onChange={e => setNewBankCardBankName(e.target.value)}
                        placeholder="例如: 招商银行" 
                        className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1 ml-1">卡号</label>
                      <input 
                        type="text" 
                        value={newBankCardNumber}
                        onChange={e => setNewBankCardNumber(e.target.value)}
                        placeholder="请输入银行卡号" 
                        className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1 ml-1">备注用途</label>
                      <input 
                        type="text" 
                        value={newBankCardRemark}
                        onChange={e => setNewBankCardRemark(e.target.value)}
                        placeholder="例如: 工资卡, 生活费" 
                        className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                      />
                    </div>
                    <div className="pt-2 flex gap-3">
                      <button 
                        onClick={() => setShowAddBankCard(false)}
                        className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={() => {
                          if (!newBankCardBankName.trim() || !newBankCardNumber.trim()) {
                            showToast('请填写完整信息');
                            return;
                          }
                          const newCard: BankCard = {
                            id: Date.now().toString(),
                            bankName: newBankCardBankName.trim(),
                            number: newBankCardNumber.trim(),
                            remark: newBankCardRemark.trim(),
                            balance: 1000 // 初始额度为1000
                          };
                          setData(prev => ({
                            ...prev,
                            bankCards: [...(prev.bankCards || []), newCard]
                          }));
                          setNewBankCardBankName('');
                          setNewBankCardNumber('');
                          setNewBankCardRemark('');
                          setShowAddBankCard(false);
                        }}
                        className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showSingleSelect && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[80%] shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-semibold">选择联系人</h3>
                <button onClick={() => setShowSingleSelect(false)} className="text-zinc-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {data.characters.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => {
                      setShowSingleSelect(false);
                      setActiveChat(c.id);
                      setData(prev => {
                        if (!prev.messages[c.id]) {
                          return { ...prev, messages: { ...prev.messages, [c.id]: [] } };
                        }
                        return prev;
                      });
                      setCurrentScreen('chat');
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-2xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                      {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} /> : c.name[0]}
                    </div>
                    <div className="flex-1 truncate text-white font-medium">{c.name}</div>
                  </button>
                ))}
                {data.characters.length === 0 && (
                  <p className="text-zinc-500 text-center p-4 text-sm">暂无角色，请先创建。</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showNewMoment && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-zinc-900/80 backdrop-blur-md text-white sticky top-0 z-20 border-b border-white/5">
              <button onClick={() => {
                setShowNewMoment(false);
                setEditingMomentId(null);
                setNewMomentContent('');
                setNewMomentImages([]);
                setNewMomentLocation('');
                setNewMomentMentions([]);
                setNewMomentVisibility('public');
                setNewMomentVisibleGroups([]);
              }} className="text-zinc-400 hover:text-white transition-colors">取消</button>
              <h1 className="text-lg font-semibold">{editingMomentId ? '编辑动态' : '发表文字'}</h1>
              <button 
                onClick={() => {
                  if (!newMomentContent.trim() && newMomentImages.length === 0) return;
                  
                  if (editingMomentId) {
                    setData(prev => ({
                      ...prev,
                      moments: prev.moments.map(m => m.id === editingMomentId ? {
                        ...m,
                        content: newMomentContent,
                        images: newMomentImages,
                        location: newMomentLocation,
                        mentions: newMomentMentions,
                        visibility: newMomentVisibility,
                        visibleGroups: newMomentVisibility === 'groups' ? newMomentVisibleGroups : undefined
                      } : m)
                    }));
                  } else {
                    setData(prev => ({
                      ...prev,
                      moments: [
                        {
                          id: Date.now().toString(),
                          authorId: 'self',
                          content: newMomentContent,
                          images: newMomentImages,
                          timestamp: Date.now(),
                          location: newMomentLocation,
                          mentions: newMomentMentions,
                          visibility: newMomentVisibility,
                          visibleGroups: newMomentVisibility === 'groups' ? newMomentVisibleGroups : undefined
                        },
                        ...(prev.moments || [])
                      ]
                    }));
                  }
                  
                  setShowNewMoment(false);
                  setEditingMomentId(null);
                  setNewMomentContent('');
                  setNewMomentImages([]);
                  setNewMomentLocation('');
                  setNewMomentMentions([]);
                  setNewMomentVisibility('public');
                  setNewMomentVisibleGroups([]);
                }}
                disabled={!newMomentContent.trim() && newMomentImages.length === 0}
                className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {editingMomentId ? '保存' : '发表'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <textarea 
                value={newMomentContent}
                onChange={e => setNewMomentContent(e.target.value)}
                placeholder="这一刻的想法..."
                className="w-full bg-transparent text-white text-lg placeholder-zinc-500 resize-none focus:outline-none min-h-[120px]"
              />
              
              <div className="flex flex-wrap gap-2 mb-6">
                {newMomentImages.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden bg-zinc-800">
                    <img src={img} alt="upload" className="w-full h-full object-cover" />
                    <button onClick={() => setNewMomentImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newMomentImages.length < 9 && (
                  <label className="w-24 h-24 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 cursor-pointer hover:bg-zinc-800 transition-colors">
                    <Plus size={32} />
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, url => setNewMomentImages(prev => [...prev, url]))} />
                  </label>
                )}
              </div>

              <div className="space-y-px bg-zinc-900 rounded-xl overflow-hidden border border-white/5">
                <div className="flex items-center justify-between p-4 bg-zinc-900">
                  <div className="flex items-center gap-3 text-white">
                    <MapPin size={20} className="text-zinc-400" />
                    <span>所在位置</span>
                  </div>
                  <input 
                    value={newMomentLocation}
                    onChange={e => setNewMomentLocation(e.target.value)}
                    placeholder="不显示位置"
                    className="bg-transparent text-right text-zinc-400 focus:outline-none w-1/2"
                  />
                </div>
                <button onClick={() => setShowMentionsSelect(true)} className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-3 text-white">
                    <AtSign size={20} className="text-zinc-400" />
                    <span>提醒谁看</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="truncate max-w-[150px]">
                      {newMomentMentions.length > 0 ? newMomentMentions.map(id => data.characters.find(c => c.id === id)?.name).join(', ') : ''}
                    </span>
                    <ChevronRight size={16} />
                  </div>
                </button>
                <button onClick={() => setShowVisibilitySelect(true)} className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-3 text-white">
                    <Eye size={20} className="text-zinc-400" />
                    <span>谁可以看</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="truncate max-w-[150px]">
                      {newMomentVisibility === 'public' ? '公开' : newMomentVisibility === 'private' ? '私密' : newMomentVisibility === 'groups' && newMomentVisibleGroups.length > 0 ? newMomentVisibleGroups.join(', ') : '部分可见'}
                    </span>
                    <ChevronRight size={16} />
                  </div>
                </button>
              </div>
            </div>

            {/* Mentions Select Overlay */}
            {showMentionsSelect && (
              <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
                <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-zinc-900/80 backdrop-blur-md text-white sticky top-0 z-20 border-b border-white/5">
                  <button onClick={() => setShowMentionsSelect(false)} className="text-zinc-400 hover:text-white transition-colors">取消</button>
                  <h1 className="text-lg font-semibold">提醒谁看</h1>
                  <button onClick={() => setShowMentionsSelect(false)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium">完成</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {data.characters.map(c => (
                    <label key={c.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                          {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} /> : c.name[0]}
                        </div>
                        <span className="text-white">{c.name}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={newMomentMentions.includes(c.id)}
                        onChange={e => {
                          if (e.target.checked) setNewMomentMentions(prev => [...prev, c.id]);
                          else setNewMomentMentions(prev => prev.filter(id => id !== c.id));
                        }}
                        className="w-5 h-5 rounded-full accent-green-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Visibility Select Overlay */}
            {showVisibilitySelect && (
              <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
                <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-zinc-900/80 backdrop-blur-md text-white sticky top-0 z-20 border-b border-white/5">
                  <button onClick={() => setShowVisibilitySelect(false)} className="text-zinc-400 hover:text-white transition-colors">取消</button>
                  <h1 className="text-lg font-semibold">谁可以看</h1>
                  <button onClick={() => setShowVisibilitySelect(false)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium">完成</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl cursor-pointer">
                      <span className="text-white">公开<span className="text-zinc-500 text-sm ml-2">所有人可见</span></span>
                      <input type="radio" name="visibility" checked={newMomentVisibility === 'public'} onChange={() => setNewMomentVisibility('public')} className="w-5 h-5 accent-green-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl cursor-pointer">
                      <span className="text-white">私密<span className="text-zinc-500 text-sm ml-2">仅自己可见</span></span>
                      <input type="radio" name="visibility" checked={newMomentVisibility === 'private'} onChange={() => setNewMomentVisibility('private')} className="w-5 h-5 accent-green-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl cursor-pointer">
                      <span className="text-white">部分可见<span className="text-zinc-500 text-sm ml-2">选中的分组可见</span></span>
                      <input type="radio" name="visibility" checked={newMomentVisibility === 'groups'} onChange={() => setNewMomentVisibility('groups')} className="w-5 h-5 accent-green-500" />
                    </label>
                  </div>

                  {newMomentVisibility === 'groups' && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <h3 className="text-zinc-400 text-sm px-2">选择分组</h3>
                      {Array.from(new Set(data.characters.map(c => c.group || '未分组'))).map(group => (
                        <label key={group} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl cursor-pointer">
                          <span className="text-white">{group}</span>
                          <input 
                            type="checkbox" 
                            checked={newMomentVisibleGroups.includes(group)}
                            onChange={e => {
                              if (e.target.checked) setNewMomentVisibleGroups(prev => [...prev, group]);
                              else setNewMomentVisibleGroups(prev => prev.filter(g => g !== group));
                            }}
                            className="w-5 h-5 rounded-full accent-green-500"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Group Manager Overlay */}
        {showGroupManager && (
          <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-zinc-900/80 backdrop-blur-md text-white sticky top-0 z-20 border-b border-white/5">
              <button onClick={() => setShowGroupManager(false)} className="text-zinc-400 hover:text-white transition-colors">取消</button>
              <h1 className="text-lg font-semibold">新建分组</h1>
              <button 
                onClick={() => {
                  if (!newGroupName.trim()) {
                    showToast('请输入分组名称');
                    return;
                  }
                  if (selectedContactsForGroup.length === 0) {
                    showToast('请至少选择一个联系人');
                    return;
                  }
                  
                  setData(prev => ({
                    ...prev,
                    characters: prev.characters.map(c => 
                      selectedContactsForGroup.includes(c.id) 
                        ? { ...c, group: newGroupName.trim() }
                        : c
                    )
                  }));
                  setShowGroupManager(false);
                }} 
                className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium"
              >
                完成
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <h3 className="text-zinc-400 text-sm mb-2 px-2">分组名称</h3>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="例如：家人、朋友、同事" 
                  className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                />
              </div>
              
              <div>
                <h3 className="text-zinc-400 text-sm mb-2 px-2">选择联系人 ({selectedContactsForGroup.length})</h3>
                <div className="space-y-2">
                  {data.characters.map(c => (
                    <label key={c.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                          {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} /> : c.name[0]}
                        </div>
                        <div>
                          <div className="text-white font-medium">{c.name}</div>
                          {c.group && c.group !== '未分组' && (
                            <div className="text-zinc-500 text-xs text-left">{c.group}</div>
                          )}
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={selectedContactsForGroup.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContactsForGroup(prev => [...prev, c.id]);
                          } else {
                            setSelectedContactsForGroup(prev => prev.filter(id => id !== c.id));
                          }
                        }}
                        className="w-5 h-5 accent-green-500 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {editingMeField && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-semibold">
                  {editingMeField === 'name' ? '修改昵称' : editingMeField === 'wechatId' ? '修改微信号' : '设置状态'}
                </h3>
                <button onClick={() => setEditingMeField(null)} className="text-zinc-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {editingMeField === 'status' && (
                  <div className="mb-4">
                    <div className="text-zinc-400 text-sm mb-2">选择心情图标</div>
                    <div className="flex flex-wrap gap-2">
                      {['😊', '😂', '😍', '😎', '😔', '😡', '😴', '🤔', '🎉', '☕', '💻', '🎮', '🎵', '🏃', '✈️'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setEditMeEmoji(emoji)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors ${editMeEmoji === emoji ? 'bg-green-500/20 border border-green-500/50' : 'bg-zinc-800 border border-transparent hover:bg-zinc-700'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <input 
                  type="text" 
                  value={editMeValue}
                  onChange={e => setEditMeValue(e.target.value)}
                  placeholder={editingMeField === 'name' ? '请输入昵称' : editingMeField === 'wechatId' ? '请输入微信号' : '请输入当前心情或状态留言'} 
                  className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                  autoFocus
                />
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={() => setEditingMeField(null)}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      setData(prev => ({
                        ...prev,
                        selfProfile: {
                          ...prev.selfProfile,
                          [editingMeField]: editMeValue,
                          ...(editingMeField === 'status' ? { statusEmoji: editMeEmoji } : {})
                        }
                      }));
                      setEditingMeField(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showWallet && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <ScreenHeader title="钱包" onBack={() => setShowWallet(false)} />
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-green-600 rounded-2xl p-6 text-white mb-6 shadow-lg shadow-green-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <button 
                    onClick={() => {
                      setData(prev => ({
                        ...prev,
                        selfProfile: {
                          ...prev.selfProfile,
                          balance: (prev.selfProfile.balance || 0) + 10000
                        }
                      }));
                    }}
                    className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1"
                  >
                    <TrendingUp size={12} />
                    暴富
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <Wallet size={20} />
                  <span>总资产</span>
                </div>
                <div className="text-4xl font-bold mb-6">
                  <span className="text-2xl mr-1">¥</span>
                  {(data.selfProfile.balance || 0).toFixed(2)}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setWalletAction('recharge');
                      setWalletAmount('');
                      setSelectedBankCardId(data.bankCards?.[0]?.id || null);
                    }}
                    className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-2 rounded-xl font-medium backdrop-blur-sm"
                  >
                    充值
                  </button>
                  <button 
                    onClick={() => {
                      setWalletAction('withdraw');
                      setWalletAmount('');
                      setSelectedBankCardId(data.bankCards?.[0]?.id || null);
                    }}
                    className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-2 rounded-xl font-medium backdrop-blur-sm"
                  >
                    提现
                  </button>
                </div>
              </div>
              
              <div className="bg-zinc-900 rounded-2xl overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={20} className="text-orange-400" />
                    <span className="text-white">理财</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500" />
                </button>
                <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Settings size={20} className="text-zinc-400" />
                    <span className="text-white">支付设置</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500" />
                </button>
              </div>
            </div>

            {walletAction && (
              <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-white font-semibold">
                      {walletAction === 'recharge' ? '充值' : '提现'}
                    </h3>
                    <button onClick={() => setWalletAction(null)} className="text-zinc-400 hover:text-white p-1">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    {walletAction && (data.bankCards || []).length > 0 && (
                      <div className="mb-4">
                        <label className="block text-zinc-400 text-xs mb-2 ml-1">
                          {walletAction === 'recharge' ? '选择支付银行卡' : '选择到账银行卡'}
                        </label>
                        <div className="space-y-2">
                          {(data.bankCards || []).map(card => (
                            <button 
                              key={card.id}
                              onClick={() => setSelectedBankCardId(card.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedBankCardId === card.id ? 'bg-green-500/10 border-green-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}
                            >
                              <div className="flex items-center gap-3">
                                <CreditCard size={18} />
                                <div className="text-left">
                                  <div className="text-sm font-medium">{card.bankName}</div>
                                  <div className="text-xs opacity-60">**** {card.number.slice(-4)} | 余额: ¥{(card.balance || 0).toFixed(2)}</div>
                                </div>
                              </div>
                              {selectedBankCardId === card.id && <div className="w-2 h-2 rounded-full bg-green-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {walletAction && (data.bankCards || []).length === 0 && (
                      <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-white/5 text-center">
                        <p className="text-zinc-400 text-sm mb-2">暂无银行卡，请先添加</p>
                        <button 
                          onClick={() => {
                            setWalletAction(null);
                            setShowBankCards(true);
                          }}
                          className="text-green-500 text-sm font-medium hover:underline"
                        >
                          去添加银行卡
                        </button>
                      </div>
                    )}

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-xl">¥</span>
                      <input 
                        type="number" 
                        value={walletAmount}
                        onChange={e => setWalletAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-zinc-800 text-white rounded-2xl pl-10 pr-4 py-4 text-2xl font-bold focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                        autoFocus
                      />
                    </div>
                    {walletAction === 'withdraw' && (
                      <div className="mt-2 text-sm text-zinc-500 px-1">
                        可用余额 ¥{(data.selfProfile.balance || 0).toFixed(2)}
                      </div>
                    )}
                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => setWalletAction(null)}
                        className="flex-1 py-4 rounded-2xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={() => {
                          const amount = parseFloat(walletAmount);
                          if (isNaN(amount) || amount <= 0) return;
                          
                          if (walletAction) {
                            if ((data.bankCards || []).length === 0) {
                              showToast('请先添加银行卡');
                              return;
                            }
                            if (!selectedBankCardId) {
                              showToast('请选择银行卡');
                              return;
                            }

                            const selectedCard = data.bankCards?.find(c => c.id === selectedBankCardId);
                            if (walletAction === 'withdraw') {
                              if (amount > (data.selfProfile.balance || 0)) {
                                showToast('余额不足');
                                return;
                              }
                            } else if (walletAction === 'recharge') {
                              if (selectedCard && amount > selectedCard.balance) {
                                showToast('银行卡余额不足');
                                return;
                              }
                            }
                          }

                          setData(prev => {
                            const newBalance = (prev.selfProfile.balance || 0) + (walletAction === 'recharge' ? amount : -amount);
                            const newBankCards = (prev.bankCards || []).map(card => {
                              if (card.id === selectedBankCardId) {
                                return {
                                  ...card,
                                  balance: card.balance + (walletAction === 'recharge' ? -amount : amount)
                                };
                              }
                              return card;
                            });
                            return {
                              ...prev,
                              selfProfile: {
                                ...prev.selfProfile,
                                balance: newBalance
                              },
                              bankCards: newBankCards
                            };
                          });
                          setWalletAction(null);
                        }}
                        className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {editingContactId && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
                <h3 className="text-white font-semibold">编辑角色设定</h3>
                <button onClick={() => setEditingContactId(null)} className="text-zinc-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <div className="flex justify-center">
                  <label className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden relative group">
                    {editContactAvatar ? (
                      <img src={editContactAvatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-zinc-500" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={20} className="text-white" />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, setEditContactAvatar)} />
                  </label>
                </div>
                
                <div>
                  <label className="block text-zinc-400 text-xs mb-1 ml-1">名称</label>
                  <input 
                    type="text" 
                    value={editContactName}
                    onChange={e => setEditContactName(e.target.value)}
                    placeholder="角色名称" 
                    className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                  />
                </div>
                
                <div>
                  <label className="block text-zinc-400 text-xs mb-1 ml-1">分组</label>
                  <input 
                    type="text" 
                    value={editContactGroup}
                    onChange={e => setEditContactGroup(e.target.value)}
                    placeholder="例如: 家人, 朋友, 同事" 
                    className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-1 ml-1">角色设定 (System Prompt)</label>
                  <textarea 
                    value={editContactDesc}
                    onChange={e => setEditContactDesc(e.target.value)}
                    placeholder="描述角色的背景、身份等..." 
                    className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5 h-24 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-1 ml-1">性格特点</label>
                  <textarea 
                    value={editContactPers}
                    onChange={e => setEditContactPers(e.target.value)}
                    placeholder="描述角色的说话方式、性格等..." 
                    className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all border border-white/5 h-24 resize-none"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-white/10 flex gap-3 shrink-0">
                <button 
                  onClick={() => setEditingContactId(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    if (!editContactName.trim()) {
                      showToast('名称不能为空');
                      return;
                    }
                    setData(prev => ({
                      ...prev,
                      characters: prev.characters.map(c => 
                        c.id === editingContactId ? { 
                          ...c, 
                          name: editContactName.trim(),
                          description: editContactDesc.trim(),
                          personality: editContactPers.trim(),
                          group: editContactGroup.trim() || undefined,
                          avatar: editContactAvatar || undefined
                        } : c
                      )
                    }));
                    setEditingContactId(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderChat = () => {
    const character = data.characters.find(c => c.id === activeChat);
    const msgs = activeChat ? (data.messages[activeChat] || []) : [];

    const headerRightNode = (
      <button 
        onClick={() => showToast('聊天详情功能开发中...')}
        className="p-1.5 text-zinc-400 hover:text-white transition-colors"
      >
        <MoreHorizontal size={24} />
      </button>
    );

    return (
      <motion.div key="chat" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-30">
        <ScreenHeader title={character?.name || '聊天'} onBack={() => setCurrentScreen('chat_list')} rightNode={headerRightNode} />
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          {msgs.map(msg => {
            const isSelf = msg.role === 'user';
            const avatarUrl = isSelf ? data.selfProfile.avatar : character?.avatar;
            const initial = isSelf ? (data.selfProfile.name?.[0] || 'U') : (character?.name?.[0] || 'A');
            
            return (
              <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isSelf ? 'self-end flex-row-reverse' : 'self-start'}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden mt-1">
                  {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : initial}
                </div>
                <div className={`rounded-2xl px-4 py-2 ${isSelf ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'}`}>
                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                  {msg.sticker && <img src={msg.sticker} alt="sticker" className="w-32 h-32 object-contain rounded-lg mt-1" />}
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="flex gap-2 max-w-[85%] self-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden mt-1">
                {character?.avatar ? <img src={character.avatar} className="w-full h-full object-cover" /> : (character?.name?.[0] || 'A')}
              </div>
              <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-2" />
        </div>

        <div className="p-3 bg-zinc-900 pb-8 border-t border-white/5">
          {showStickers && (
            <div className="h-48 bg-zinc-950 rounded-2xl mb-3 p-3 overflow-y-auto grid grid-cols-4 gap-2 border border-white/5">
              {data.stickers.map((s, i) => (
                <img key={i} src={s} onClick={() => sendMessage('', s)} className="w-full aspect-square object-cover rounded-xl cursor-pointer active:scale-95 transition-transform" />
              ))}
              {data.stickers.length === 0 && <p className="col-span-4 text-center text-zinc-500 text-sm mt-4">暂无贴纸。</p>}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button onClick={() => showToast('功能开发中...')} className="p-2 text-zinc-400 hover:text-white transition-colors shrink-0">
              <PlusCircle size={24} />
            </button>
            <button onClick={() => setShowStickers(!showStickers)} className={`p-2 rounded-full transition-colors shrink-0 ${showStickers ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Smile size={24} />
            </button>
            <input 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(inputText)}
              placeholder="发消息..."
              className="flex-1 bg-zinc-800 text-white rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
            />
            <button onClick={() => showToast('功能开发中...')} className="p-2 text-zinc-400 hover:text-white transition-colors shrink-0">
              <Plus size={24} />
            </button>
            <button onClick={() => sendMessage(inputText)} disabled={!inputText.trim()} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-zinc-700 transition-colors shrink-0">
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCharacters = () => {
    const addCharacter = () => {
      if (!newCharName.trim()) return;
      const newChar: Character = {
        id: Date.now().toString(),
        name: newCharName.trim(),
        description: newCharDesc.trim(),
        personality: newCharPers.trim(),
        avatar: newCharAvatar || undefined
      };
      setData(prev => ({ ...prev, characters: [...prev.characters, newChar] }));
      setNewCharName(''); setNewCharDesc(''); setNewCharPers(''); setNewCharAvatar(null);
    };

    const deleteCharacter = (id: string) => {
      setData(prev => {
        const newMessages = { ...prev.messages };
        delete newMessages[id];
        return {
          ...prev,
          characters: prev.characters.filter(c => c.id !== id),
          messages: newMessages
        };
      });
    };

    return (
      <motion.div key="characters" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
        <ScreenHeader title="角色" onBack={() => setCurrentScreen('home')} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
          {data.characters.map(c => (
            <div key={c.id} className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                    {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt={c.name} /> : c.name[0]}
                  </div>
                  <h3 className="text-white font-semibold text-lg">{c.name}</h3>
                </div>
                <button onClick={() => deleteCharacter(c.id)} className="text-red-400 p-1 hover:bg-red-400/10 rounded-full transition-colors"><Trash2 size={18}/></button>
              </div>
              <p className="text-zinc-400 text-sm mb-1"><span className="text-zinc-500">描述:</span> {c.description}</p>
              <p className="text-zinc-400 text-sm"><span className="text-zinc-500">性格:</span> {c.personality}</p>
            </div>
          ))}
          
          <div className="bg-zinc-900 p-4 rounded-2xl border border-white/10 mt-6">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Plus size={18}/> 添加新角色</h3>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                {newCharAvatar ? (
                  <img src={newCharAvatar} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-zinc-500" size={24} />
                )}
                <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setNewCharAvatar)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1">
                <input value={newCharName} onChange={e => setNewCharName(e.target.value)} placeholder="名字" className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <input value={newCharDesc} onChange={e => setNewCharDesc(e.target.value)} placeholder="描述 (例如：一位睿智的老巫师)" className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input value={newCharPers} onChange={e => setNewCharPers(e.target.value)} placeholder="性格 (例如：说话像打哑谜)" className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <button onClick={addCharacter} disabled={!newCharName.trim()} className="w-full bg-blue-600 text-white rounded-xl py-2 font-medium disabled:opacity-50 transition-opacity">添加角色</button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSelfProfile = () => (
    <motion.div key="self" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
      <ScreenHeader title="我的资料" onBack={() => setCurrentScreen('home')} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-white/10 mb-2">
              {data.selfProfile.avatar ? (
                <img src={data.selfProfile.avatar} className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="text-zinc-500" size={48} />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => handleFileUpload(e, url => setData(prev => ({...prev, selfProfile: {...prev.selfProfile, avatar: url}})))} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>
            <p className="text-zinc-500 text-xs">点击修改头像</p>
          </div>

          <p className="text-zinc-400 text-sm mb-6">这些信息能帮助 AI 角色了解他们在和谁聊天。</p>
          
          <label className="block text-zinc-500 text-sm mb-1 ml-1">你的名字</label>
          <input 
            value={data.selfProfile.name} 
            onChange={e => setData(prev => ({...prev, selfProfile: {...prev.selfProfile, name: e.target.value}}))} 
            className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-purple-500" 
            placeholder="例如：小明"
          />
          
          <label className="block text-zinc-500 text-sm mb-1 ml-1">关于你</label>
          <textarea 
            value={data.selfProfile.description} 
            onChange={e => setData(prev => ({...prev, selfProfile: {...prev.selfProfile, description: e.target.value}}))} 
            className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-purple-500 h-32 resize-none" 
            placeholder="例如：我喜欢徒步和看科幻小说。"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderWorldbook = () => {
    const addEntry = () => {
      if (!newWbTitle.trim() || !newWbContent.trim()) return;
      const newEntry: WorldbookEntry = {
        id: Date.now().toString(),
        title: newWbTitle.trim(),
        content: newWbContent.trim(),
        type: newWbType,
        characterIds: newWbType === 'specific' ? newWbCharIds : []
      };
      setData(prev => ({ ...prev, worldbooks: [...(prev.worldbooks || []), newEntry] }));
      setNewWbTitle(''); setNewWbContent(''); setNewWbType('global'); setNewWbCharIds([]);
    };

    const deleteEntry = (id: string) => {
      setData(prev => ({ ...prev, worldbooks: (prev.worldbooks || []).filter(w => w.id !== id) }));
    };

    const toggleCharId = (id: string) => {
      setNewWbCharIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    return (
      <motion.div key="worldbook" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
        <ScreenHeader title="世界书" onBack={() => setCurrentScreen('home')} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
          {(data.worldbooks || []).map(wb => (
            <div key={wb.id} className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-semibold text-lg flex items-center flex-wrap gap-2">
                  {wb.title} 
                  <span className="text-xs bg-zinc-800 px-2 py-1 rounded-full text-zinc-400 font-normal">{wb.type === 'global' ? '全局' : '指定'}</span>
                </h3>
                <button onClick={() => deleteEntry(wb.id)} className="text-red-400 p-1 hover:bg-red-400/10 rounded-full transition-colors"><Trash2 size={18}/></button>
              </div>
              <p className="text-zinc-400 text-sm whitespace-pre-wrap">{wb.content}</p>
              {wb.type === 'specific' && wb.characterIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {wb.characterIds.map(id => {
                    const c = data.characters.find(char => char.id === id);
                    return c ? <span key={id} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{c.name}</span> : null;
                  })}
                </div>
              )}
            </div>
          ))}
          
          <div className="bg-zinc-900 p-4 rounded-2xl border border-white/10 mt-6">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Plus size={18}/> 添加设定</h3>
            <input value={newWbTitle} onChange={e => setNewWbTitle(e.target.value)} placeholder="标题 (例如：魔法设定)" className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <textarea value={newWbContent} onChange={e => setNewWbContent(e.target.value)} placeholder="设定内容..." className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 resize-none" />
            
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer">
                <input type="radio" checked={newWbType === 'global'} onChange={() => setNewWbType('global')} className="accent-blue-500" /> 全局
              </label>
              <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer">
                <input type="radio" checked={newWbType === 'specific'} onChange={() => setNewWbType('specific')} className="accent-blue-500" /> 指定角色
              </label>
            </div>

            {newWbType === 'specific' && (
              <div className="mb-3 p-3 bg-zinc-950 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                <p className="text-xs text-zinc-500 mb-2">选择适用的角色：</p>
                {data.characters.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-zinc-300 text-sm mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={newWbCharIds.includes(c.id)} onChange={() => toggleCharId(c.id)} className="accent-blue-500 rounded" /> {c.name}
                  </label>
                ))}
                {data.characters.length === 0 && <p className="text-xs text-zinc-600">暂无角色</p>}
              </div>
            )}

            <button onClick={addEntry} disabled={!newWbTitle.trim() || !newWbContent.trim() || (newWbType === 'specific' && newWbCharIds.length === 0)} className="w-full bg-blue-600 text-white rounded-xl py-2 font-medium disabled:opacity-50 transition-opacity">添加设定</button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderStickers = () => (
    <motion.div key="stickers" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
      <ScreenHeader title="贴纸" onBack={() => setCurrentScreen('home')} />
      <div className="flex-1 overflow-y-auto p-4">
        <label className="flex items-center justify-center w-full h-24 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-colors mb-4">
          <div className="flex flex-col items-center text-zinc-400">
            <Plus size={24} className="mb-1" />
            <span className="text-sm">上传贴纸</span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, url => setData(prev => ({...prev, stickers: [...prev.stickers, url]})))} />
        </label>
        
        <div className="grid grid-cols-3 gap-3">
          {data.stickers.map((s, i) => (
            <div key={i} className="relative group aspect-square bg-zinc-900 rounded-xl p-2 border border-white/5">
              <img src={s} className="w-full h-full object-contain" />
              <button onClick={() => setData(prev => ({...prev, stickers: prev.stickers.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderThemes = () => {
    const toggleCategory = (category: string) => {
      setExpandedThemeCategory(prev => prev === category ? null : category);
    };

    return (
      <motion.div key="themes" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
        <ScreenHeader title="主题" onBack={() => setCurrentScreen('home')} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* 主界面壁纸 */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleCategory('wallpaper')}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">主界面壁纸</span>
              {expandedThemeCategory === 'wallpaper' ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedThemeCategory === 'wallpaper' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-zinc-800">
                    <label className="flex items-center justify-center w-full h-32 bg-zinc-800/50 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-colors mb-4 mt-4">
                      <div className="flex flex-col items-center text-zinc-400">
                        <ImageIcon size={32} className="mb-2" />
                        <span className="text-sm">设置壁纸</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, url => setData(prev => ({...prev, wallpaper: url})))} />
                    </label>
                    
                    {data.wallpaper && (
                      <div>
                        <p className="text-zinc-500 text-sm mb-2 ml-1">当前壁纸</p>
                        <div className="relative w-32 h-56 rounded-2xl overflow-hidden border-4 border-zinc-800 shadow-lg">
                          <img src={data.wallpaper} className="w-full h-full object-cover" />
                          <button onClick={() => setData(prev => ({...prev, wallpaper: null}))} className="absolute bottom-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 字体字号 */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleCategory('font')}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">字体字号</span>
              {expandedThemeCategory === 'font' ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedThemeCategory === 'font' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-zinc-800 flex flex-col items-center justify-center h-32 text-zinc-500">
                    <p>字体设置功能开发中...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 外观设定 */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleCategory('appearance')}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">外观设定</span>
              {expandedThemeCategory === 'appearance' ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedThemeCategory === 'appearance' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-zinc-800 flex flex-col items-center justify-center h-32 text-zinc-500">
                    <p>外观设定功能开发中...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </motion.div>
    );
  };

  const renderJump = () => {
    const selectedChar = data.characters.find(c => c.id === selectedJumpCharacterId);
    return (
      <motion.div
        key="jump"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="absolute inset-0 z-10 bg-zinc-900 text-white"
      >
        <ScreenHeader title="跃迁" onBack={() => { setCurrentScreen('home'); setSelectedJumpCharacterId(null); }} />
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">人生跃迁</h2>
          <p className="mb-4">选择一个角色，将其年龄跃迁至特定人生阶段。</p>
          
          <select 
            value={selectedJumpCharacterId || ''}
            onChange={(e) => setSelectedJumpCharacterId(e.target.value || null)}
            className="w-full p-3 bg-zinc-800 rounded-xl text-white mb-6"
          >
            <option value="">请选择一个角色</option>
            {data.characters.map(char => (
              <option key={char.id} value={char.id}>{char.name}</option>
            ))}
          </select>

          {selectedChar && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-800 rounded-xl">
                <div className="font-semibold text-lg">{selectedChar.name}</div>
                <div className="text-zinc-400">当前年龄: {selectedChar.age || '未知'}</div>
              </div>
              
              <div className="space-y-2">
                {LIFE_STAGES.map(stage => (
                  <button 
                    key={stage.age}
                    onClick={() => {
                      setData(prev => ({
                        ...prev,
                        characters: prev.characters.map(c => c.id === selectedChar.id ? { ...c, age: stage.age } : c)
                      }));
                      setJumpChat({ characterId: selectedChar.id, stage: stage.label });
                      showToast(`已将 ${selectedChar.name} 的年龄跃迁至 ${stage.label} (${stage.age} 岁)`);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-left"
                  >
                    <div>
                      <div className="font-semibold">{stage.label}</div>
                      <div className="text-sm text-zinc-400">{stage.range}</div>
                    </div>
                    <div className="text-zinc-500">{stage.age} 岁</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderJumpChat = () => {
    if (!jumpChat) return null;
    const char = data.characters.find(c => c.id === jumpChat.characterId);
    
    const handleSend = () => {
      if (!jumpChatInput.trim()) return;
      const newMessages = [
        ...jumpChatMessages,
        { sender: 'user' as const, text: jumpChatInput }
      ];
      setJumpChatMessages(newMessages);
      setJumpChatInput('');
      
      // Simulate character response
      setTimeout(() => {
        setJumpChatMessages(prev => [...prev, { sender: 'character' as const, text: `关于“${jumpChatInput}”，我有一些想法...` }]);
      }, 1000);
    };

    return (
      <motion.div
        key="jumpChat"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 z-20 bg-zinc-950 text-white"
      >
        <ScreenHeader title={`${char?.name} - ${jumpChat.stage}对话`} onBack={() => { setJumpChat(null); setJumpChatMessages([]); }} />
        <div className="p-4 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="p-4 bg-zinc-800 rounded-xl text-zinc-300 italic">
              <p>此时的 {char?.name} 正处于 {jumpChat.stage} 阶段。</p>
            </div>
            {jumpChatMessages.map((msg, idx) => (
              <div key={idx} className={`p-4 rounded-xl ${msg.sender === 'user' ? 'bg-blue-900/50 self-end' : 'bg-zinc-700'}`}>
                <p className="font-semibold text-sm opacity-70">{msg.sender === 'user' ? '我' : char?.name}:</p>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-zinc-800 flex gap-2">
            <input 
              type="text" 
              className="flex-1 p-3 bg-zinc-800 rounded-xl" 
              placeholder="输入消息..." 
              value={jumpChatInput}
              onChange={(e) => setJumpChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="bg-blue-600 px-4 py-2 rounded-xl">发送</button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTamagotchi = () => (
    <motion.div
      key="tamagotchi"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-20 bg-zinc-950 text-white overflow-hidden"
    >
      <ScreenHeader title="拓麻歌子" onBack={() => setCurrentScreen('home')} />
      <div className="h-full overflow-y-auto">
        <TamagotchiApp />
      </div>
    </motion.div>
  );

  const renderPeriod = () => (
    <motion.div
      key="period"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-20 bg-zinc-950 text-white overflow-hidden"
    >
      <ScreenHeader title="经期" onBack={() => setCurrentScreen('home')} />
      <div className="h-full overflow-y-auto">
        <PeriodApp />
      </div>
    </motion.div>
  );

  interface BackpackScreenProps {
    data: PhoneData;
    setData: React.Dispatch<React.SetStateAction<PhoneData>>;
    setCurrentScreen: React.Dispatch<React.SetStateAction<Screen>>;
    showToast: (msg: string) => void;
  }

  const BackpackScreen: React.FC<BackpackScreenProps> = ({ data, setData, setCurrentScreen, showToast }) => {
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [isGifting, setIsGifting] = useState(false);

    const handleGiftItem = async () => {
      if (!selectedItem || !selectedCharacter) return;

      const character = data.characters.find(c => c.id === selectedCharacter);
      if (!character) return;

      setIsGifting(true);
      try {
        const apiKey = data.settings.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");
        
        const aiConfig: any = { apiKey };
        if (data.settings.apiUrl) {
          aiConfig.httpOptions = { baseUrl: data.settings.apiUrl };
        }
        const ai = new GoogleGenAI(aiConfig);
        
        const applicableWorldbooks = (data.worldbooks || []).filter(wb => 
          wb.type === 'global' || (wb.type === 'specific' && wb.characterIds.includes(selectedCharacter))
        );

        let worldbookContext = '';
        if (applicableWorldbooks.length > 0) {
          worldbookContext = `\n\n[世界设定/背景知识 (Worldbook)]\n` + 
            applicableWorldbooks.map(wb => `--- ${wb.title} ---\n${wb.content}`).join('\n\n') + 
            `\n[以上是世界设定，请在回复时遵循这些设定。]\n`;
        }
        
        const systemInstruction = `You are playing the role of a character named ${character.name}.
Description: ${character.description}
Personality: ${character.personality}

You are chatting with a user named ${data.selfProfile.name || 'User'}.
User Description: ${data.selfProfile.description || 'No description provided.'}
User's Current Status/Mood: ${data.selfProfile.statusEmoji || ''} ${data.selfProfile.status || 'Not specified.'}${worldbookContext}

The user just gifted you a ${selectedItem.name} (${selectedItem.emoji}). Respond naturally as your character would when receiving this gift. Keep responses concise like text messages.`;

        const contents = [{
          role: 'user',
          parts: [{ text: `I just gave you a ${selectedItem.name}! ${selectedItem.emoji}` }]
        }];

        const response = await ai.models.generateContent({
          model: data.settings.model || 'gemini-3.1-flash-preview',
          contents: contents,
          config: {
            systemInstruction,
          }
        });

        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: response.text,
          timestamp: Date.now()
        };

        const updatedMessages = {
          ...data.messages,
          [selectedCharacter]: [...(data.messages[selectedCharacter] || []), aiMessage]
        };

        setData(prev => ({
          ...prev,
          messages: updatedMessages,
          backpackItems: prev.backpackItems.filter(item => item.id !== selectedItem.id)
        }));

        setSelectedItem(null);
        setSelectedCharacter(null);
        showToast(`已赠送 ${selectedItem.emoji} 给 ${character.name}！`);
      } catch (error) {
        console.error("AI Error:", error);
        showToast("赠送失败，请检查设置");
      } finally {
        setIsGifting(false);
      }
    };

    const groupedItems = data.backpackItems.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    return (
      <motion.div
        key="backpack"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 z-20 bg-zinc-950 text-white overflow-hidden"
      >
        <ScreenHeader title="背包" onBack={() => setCurrentScreen('home')} />
        
        <div className="h-full overflow-y-auto p-4 space-y-6">
          {data.backpackItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <ShoppingBag size={64} className="mb-4 opacity-50" />
              <p>背包是空的</p>
              <p className="text-sm mt-2">让你的宠物出去玩耍来收集物品吧！</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([type, items]) => (
              <div key={type} className="space-y-3">
                <h3 className="text-lg font-semibold text-zinc-300 capitalize">
                  {type === 'food' ? '食物' : 
                   type === 'toy' ? '玩具' : 
                   type === 'household' ? '家居' : '特殊物品'}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all ${
                        selectedItem?.id === item.id 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <span className="text-2xl mb-1">{item.emoji}</span>
                      <span className="text-xs text-center leading-tight">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Gift Modal */}
        {selectedItem && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-semibold">赠送物品</h3>
                <button onClick={() => { setSelectedItem(null); setSelectedCharacter(null); }} className="text-zinc-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">{selectedItem.emoji}</div>
                  <div className="text-white font-medium">{selectedItem.name}</div>
                  <div className="text-zinc-400 text-sm">选择要赠送的角色</div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.characters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedCharacter === char.id 
                          ? 'bg-green-500/10 border-green-500 text-white' 
                          : 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                        {char.avatar ? <img src={char.avatar} className="w-full h-full object-cover" /> : char.name[0]}
                      </div>
                      <span className="text-left">{char.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setSelectedItem(null); setSelectedCharacter(null); }}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleGiftItem}
                    disabled={!selectedCharacter || isGifting}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGifting ? '赠送中...' : '赠送'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };


  const renderPlaceholder = (title: string) => (
    <motion.div
      key={title}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-20 bg-zinc-950 text-white"
    >
      <ScreenHeader title={title} onBack={() => setCurrentScreen('home')} />
      <div className="p-4 flex flex-col items-center justify-center h-full text-zinc-500">
        <p>{title} 应用正在开发中...</p>
      </div>
    </motion.div>
  );

  const renderTwitter = () => {
    const postTweet = () => {
      const content = twitterDraft.trim();
      if (!content) return;

      const newTweet = {
        id: Date.now().toString(),
        authorName: '你',
        authorHandle: '@me',
        avatar: '',
        content,
        timestamp: Date.now(),
        likes: 0,
        retweets: 0,
        comments: 0,
      };

      setData(prev => ({
        ...prev,
        xPosts: [newTweet, ...(prev.xPosts || [])],
      }));
      setTwitterDraft('');
      showToast('已发布到 X');
    };

    const tweets = data.xPosts || [];

    return (
      <motion.div
        key="twitter"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 z-20 bg-zinc-950 text-white overflow-y-auto"
      >
        <ScreenHeader title="X" onBack={() => setCurrentScreen('home')} />

        <div className="flex items-center justify-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-950 sticky top-[64px] z-30">
          <button
            onClick={() => setTwitterTab('forYou')}
            className={`px-4 py-1 rounded-full text-sm ${twitterTab === 'forYou' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}
          >
            为你推荐
          </button>
          <button
            onClick={() => setTwitterTab('following')}
            className={`px-4 py-1 rounded-full text-sm ${twitterTab === 'following' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}
          >
            正在关注
          </button>
        </div>

        <div className="p-3 space-y-3 pb-28">
          <div className="bg-zinc-900 rounded-xl p-3">
            <textarea
              value={twitterDraft}
              onChange={e => setTwitterDraft(e.target.value)}
              rows={3}
              placeholder="说点什么..."
              className="w-full bg-zinc-800 text-white rounded-lg p-2 outline-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={postTweet}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm"
              >
                发布
              </button>
            </div>
          </div>

          {tweets.length === 0 ? (
            <div className="text-zinc-500 text-center py-10">暂时没有动态，发布你的第一条 X 状态吧。</div>
          ) : (
            tweets
              .filter(tweet => twitterTab === 'forYou' || twitterTab === 'following')
              .map(tweet => (
                <div key={tweet.id} className="bg-zinc-900 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">
                      {tweet.authorName[0] || 'X'}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{tweet.authorName}</div>
                      <div className="text-xs text-zinc-500">{tweet.authorHandle} · {new Date(tweet.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="text-sm leading-6">{tweet.content}</div>
                  <div className="flex items-center justify-between text-zinc-500 text-xs">
                    <span>💬 {tweet.comments}</span>
                    <span>🔁 {tweet.retweets}</span>
                    <span>❤ {tweet.likes}</span>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 flex items-center justify-around py-2">
          <button onClick={() => showToast('首页已选')} className="text-zinc-300 hover:text-white">
            主页
          </button>
          <button onClick={() => showToast('搜索已选')} className="text-zinc-300 hover:text-white">
            搜索
          </button>
          <button onClick={() => showToast('通知已选')} className="text-zinc-300 hover:text-white">
            通知
          </button>
          <button onClick={() => showToast('消息已选')} className="text-zinc-300 hover:text-white">
            私信
          </button>
        </div>
      </motion.div>
    );
  };


  interface XianyuItem {
    id: string;
    title: string;
    price: string;
    image: string;
    location: string;
    postedAt: string;
    dealType: '急出' | '随缘' | '直拍';
    originalPrice: string;
    comments: string[];
  }

  const XianyuApp: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
    const [items, setItems] = useState<XianyuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<XianyuItem | null>(null);

    const randomDealType = () => {
      const list: XianyuItem['dealType'][] = ['急出', '随缘', '直拍'];
      return list[Math.floor(Math.random() * list.length)];
    };

    const randomComment = (title: string, dealType: XianyuItem['dealType']) => {
      const base = [
        `这个${title}我看了好几天了，性价比不错。`,
        `这价格很有诚意了，老板有没有优惠？`,
        `感觉挺划算的，港真我也想下单。`
      ];

      const urgent = [
        '急出 急出！老板要回家了，直接拿下！',
        '这价格太香了，赶紧抢！',
        '是真的急着出，不要犹豫了。'
      ];

      const randoms = [
        '随缘随缘，有缘就带走。',
        '价格可以再聊，不着急。',
        '看缘分，看有没有喜欢的人。'
      ];

      const direct = [
        '直拍不还价，喜欢就拿走。',
        '正常价，货真价实。',
        '跟着感觉走，不出错。'
      ];

      const pool = dealType === '急出' ? urgent : dealType === '随缘' ? randoms : direct;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('https://fakestoreapi.com/products?limit=24');
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        const now = Date.now();
        const normalized: XianyuItem[] = data.map((item: any, idx: number) => {
          const dealType = randomDealType();
          const baseCny = item.price * 6.9;
          const multiplier = dealType === '急出'
            ? 0.45 + Math.random() * 0.15
            : dealType === '随缘'
              ? 1.5 + Math.random() * 0.5
              : 0.9 + Math.random() * 0.2;
          const finalPrice = Math.max(1, Math.round(baseCny * multiplier));
          const originalPrice = `¥${Math.round(baseCny)}`;

          const comments = Array.from({ length: 3 }, () => randomComment(item.title, dealType));

          return {
            id: item.id.toString(),
            title: item.title,
            price: `¥${finalPrice}`,
            originalPrice,
            image: item.image,
            location: ['北京', '上海', '深圳', '广州', '杭州'][idx % 5],
            postedAt: new Date(now - idx * 3600 * 1000).toLocaleString('zh-CN', { hour12: false }),
            dealType,
            comments,
          };
        });
        setItems(normalized);
        showToast('刷新成功');
      } catch (err: any) {
        setError(err?.message || '网络错误');
        showToast('刷新失败');
      } finally {
        setLoading(false);
      }
    };

      const filtered = items.filter(item => item.title.toLowerCase().includes(search.toLowerCase()));

    const dealTagColor = (dealType: XianyuItem['dealType']) =>
      dealType === '急出' ? 'bg-red-500/20 text-red-200' : dealType === '随缘' ? 'bg-amber-500/20 text-amber-200' : 'bg-green-500/20 text-green-200';

    return (
      <motion.div
        key="xianyu"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 z-20 bg-zinc-950 text-white overflow-hidden"
      >
        <ScreenHeader
          title="闲鱼"
          onBack={() => setCurrentScreen('home')}
          rightNode={
            <button
              onClick={fetchItems}
              className="flex items-center gap-1 text-zinc-200 hover:text-white"
              title="刷新"
            >
              <RefreshCw size={18} />
            </button>
          }
        />

        <div className="h-full flex flex-col">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜宝贝、搜关键词"
                className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={fetchItems}
                className="text-xs bg-emerald-500/20 text-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-500/30"
              >
                刷新
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">加载中...</div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                <div>出了点问题：{error}</div>
                <button
                  onClick={fetchItems}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                >重试</button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
                <div className="text-lg">欢迎来到闲鱼</div>
                <div className="text-sm text-zinc-400">点击右上角刷新按钮加载最新商品</div>
                <button
                  onClick={fetchItems}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                >立即刷新</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500">没有找到匹配商品。</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4">
                {filtered.map(item => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedItem(item); }}
                    className="flex gap-3 bg-zinc-900/60 rounded-2xl p-3 text-left hover:bg-zinc-900/80 transition-colors cursor-pointer"
                  >
                    <img src={item.image} alt={item.title} className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-white line-clamp-2">{item.title}</div>
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${dealTagColor(item.dealType)}`}>{item.dealType}</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">{item.location} · {item.postedAt}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-emerald-200">{item.price}</span>
                          {item.originalPrice !== item.price && (
                            <span className="text-xs text-zinc-500 line-through">{item.originalPrice}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); showToast('暂不支持购买功能'); }}
                          className="text-xs px-3 py-1 rounded-xl bg-white/10 text-white hover:bg-white/15"
                        >
                          关注
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">{selectedItem.title}</div>
                  <div className="text-xs text-zinc-400">{selectedItem.location} · {selectedItem.postedAt}</div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-zinc-400 hover:text-white p-2">
                  <X size={18} />
                </button>
              </div>
              <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-44 object-cover" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${dealTagColor(selectedItem.dealType)}`}>{selectedItem.dealType}</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-200">{selectedItem.price}</div>
                    {selectedItem.originalPrice !== selectedItem.price && (
                      <div className="text-xs text-zinc-500 line-through">{selectedItem.originalPrice}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-zinc-300">网友吐槽：</div>
                <div className="space-y-2">
                  {selectedItem.comments.map((c, idx) => (
                    <div key={idx} className="text-xs text-zinc-200 bg-white/5 rounded-xl p-3">
                      {c}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    showToast('这功能暂时还没做~');
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600"
                >
                  试试出价
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };


  const renderSettings = () => {
    const toggleCategory = (category: string) => {
      setExpandedSettingsCategory(prev => prev === category ? null : category);
    };

    const handleSavePreset = () => {
      if (!presetName.trim()) return;
      setData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          apiPresets: [
            ...(prev.settings.apiPresets || []),
            {
              name: presetName,
              apiUrl: prev.settings.apiUrl,
              apiKey: prev.settings.apiKey,
              model: prev.settings.model,
              temperature: prev.settings.temperature
            }
          ]
        }
      }));
      setPresetName('');
    };

    const handleLoadPreset = (preset: any) => {
      setData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          apiUrl: preset.apiUrl,
          apiKey: preset.apiKey,
          model: preset.model,
          temperature: preset.temperature
        }
      }));
    };

    const handleDeletePreset = (index: number) => {
      setData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          apiPresets: (prev.settings.apiPresets || []).filter((_, i) => i !== index)
        }
      }));
    };

    const handleExport = () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_phone_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          if (importedData && importedData.characters && importedData.settings) {
            setData(importedData);
            showToast('数据导入成功！');
          } else {
            showToast('无效的数据文件格式。');
          }
        } catch (error) {
          showToast('导入失败，文件可能已损坏。');
        }
      };
      reader.readAsText(file);
    };

    const handleClearData = () => {
      setData(DEFAULT_DATA);
      localStorage.removeItem('ai_phone_data');
      setShowClearConfirm(false);
      showToast('所有数据已清除并恢复默认设置。');
    };

    return (
      <motion.div key="settings" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 bg-zinc-950 flex flex-col z-20">
        <ScreenHeader title="设置" onBack={() => setCurrentScreen('home')} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* API 设置 */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleCategory('api')}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">API 设置</span>
              {expandedSettingsCategory === 'api' ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSettingsCategory === 'api' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-zinc-800">
                    <label className="block text-zinc-500 text-sm mb-1 ml-1 mt-4">API 地址 (代理)</label>
                    <input 
                      value={data.settings.apiUrl || ''} 
                      onChange={e => setData(prev => ({...prev, settings: {...prev.settings, apiUrl: e.target.value}}))} 
                      placeholder="/genai（开发模式可自动代理，生产请使用后端代理）"
                      className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-gray-500 border border-white/10"
                    />

                    <label className="block text-zinc-500 text-sm mb-1 ml-1">API 密钥</label>
                    <input 
                      type="password"
                      value={data.settings.apiKey || ''} 
                      onChange={e => setData(prev => ({...prev, settings: {...prev.settings, apiKey: e.target.value}}))} 
                      placeholder="留空使用默认"
                      className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-gray-500 border border-white/10"
                    />

                    <label className="block text-zinc-500 text-sm mb-1 ml-1">AI 模型</label>
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="w-64 max-w-full">
                          <select 
                            value={data.settings.model} 
                            title={data.settings.model}
                            onChange={e => setData(prev => ({...prev, settings: {...prev.settings, model: e.target.value}}))} 
                            className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-500 border border-white/10 truncate"
                            style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                          >
                            {availableModels.length > 0 ? (
                              availableModels.map(m => <option key={m} value={m}>{m}</option>)
                            ) : (
                              <>
                                <option value="gemini-3.1-flash-preview">Gemini 3.1 Flash</option>
                                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                                {data.settings.model && !['gemini-3.1-flash-preview', 'gemini-3.1-pro-preview'].includes(data.settings.model) && (
                                  <option value={data.settings.model}>{data.settings.model}</option>
                                )}
                              </>
                            )}
                          </select>
                        </div>
                        <button 
                          onClick={fetchModels}
                          disabled={isFetchingModels}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
                        >
                          {isFetchingModels ? '...' : '获取'}
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          const ok = await fetchModels();
                          if (ok) showToast('API 连接成功');
                        }}
                        disabled={isFetchingModels}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        测试连接
                      </button>
                    </div>

                    <label className="block text-zinc-500 text-sm mb-1 ml-1">自定义模型名称</label>
                    <input 
                      value={data.settings.model} 
                      onChange={e => setData(prev => ({...prev, settings: {...prev.settings, model: e.target.value}}))} 
                      placeholder="例如：gpt-4o"
                      className="w-full bg-zinc-950 text-white rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-gray-500 border border-white/10"
                    />

                    <label className="block text-zinc-500 text-sm mb-1 ml-1 flex justify-between">
                      <span>温度 (Temperature)</span>
                      <span>{data.settings.temperature ?? 1}</span>
                    </label>
                    <input 
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={data.settings.temperature ?? 1} 
                      onChange={e => setData(prev => ({...prev, settings: {...prev.settings, temperature: parseFloat(e.target.value)}}))} 
                      className="w-full mb-6 accent-blue-500"
                    />

                    <div className="border-t border-zinc-800 pt-4 mb-2">
                      <h4 className="text-white font-medium mb-3">API 预设</h4>
                      
                      <div className="flex gap-2 mb-4">
                        <input 
                          value={presetName} 
                          onChange={e => setPresetName(e.target.value)} 
                          placeholder="预设名称"
                          className="flex-1 bg-zinc-950 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-500 border border-white/10"
                        />
                        <button 
                          onClick={handleSavePreset}
                          disabled={!presetName.trim()}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                        >
                          <Save size={16} /> 保存
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(data.settings.apiPresets || []).map((preset, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-white/5">
                            <div className="flex-1 min-w-0 mr-2 cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                              <div className="text-white text-sm font-medium truncate">{preset.name}</div>
                              <div className="text-zinc-500 text-xs truncate">{preset.model}</div>
                            </div>
                            <button onClick={() => handleDeletePreset(idx)} className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {(data.settings.apiPresets || []).length === 0 && (
                          <p className="text-zinc-500 text-sm text-center py-2">暂无保存的预设</p>
                        )}
                      </div>
                    </div>

                    <p className="text-zinc-500 text-xs mt-4 ml-1">留空 API 地址和密钥以使用平台默认的 Gemini API。</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 消息提醒 */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleCategory('notifications')}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">消息提醒</span>
              {expandedSettingsCategory === 'notifications' ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSettingsCategory === 'notifications' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-zinc-800 space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">消息弹窗</div>
                        <div className="text-zinc-500 text-xs">收到新消息时在屏幕顶部显示弹窗</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={data.settings.notifications?.popups ?? true}
                          onChange={e => setData(prev => ({
                            ...prev, 
                            settings: {
                              ...prev.settings, 
                              notifications: { ...prev.settings.notifications, popups: e.target.checked }
                            }
                          }))}
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">后台保活</div>
                        <div className="text-zinc-500 text-xs">允许应用在后台接收消息</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={data.settings.notifications?.keepAlive ?? true}
                          onChange={e => setData(prev => ({
                            ...prev, 
                            settings: {
                              ...prev.settings, 
                              notifications: { ...prev.settings.notifications, keepAlive: e.target.checked }
                            }
                          }))}
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 数据 */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleCategory('data')}
              className="w-full flex items-center justify-between p-4 text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">数据管理</span>
              {expandedSettingsCategory === 'data' ? <ChevronDown size={20} className="text-zinc-400" /> : <ChevronRight size={20} className="text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSettingsCategory === 'data' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-zinc-800 mt-4 space-y-3">
                    <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors">
                      <Download size={18} /> 导出所有数据
                    </button>
                    
                    <label className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium cursor-pointer transition-colors">
                      <Upload size={18} /> 导入数据
                      <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>

                    <div className="pt-4 mt-4 border-t border-zinc-800">
                      {!showClearConfirm ? (
                        <button onClick={() => setShowClearConfirm(true)} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-medium transition-colors">
                          <Trash2 size={18} /> 清除所有数据
                        </button>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-red-500 font-medium mb-2">
                            <AlertTriangle size={18} /> 确认清除所有数据？
                          </div>
                          <p className="text-red-400/80 text-xs mb-4">此操作不可逆，所有聊天记录、角色和设置将被永久删除。</p>
                          <div className="flex gap-2">
                            <button onClick={() => setShowClearConfirm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                              取消
                            </button>
                            <button onClick={handleClearData} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                              确认清除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden bg-black">
      {toast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-zinc-800/80 text-white px-4 py-2 rounded-full shadow-lg text-sm animate-fade-in-down backdrop-blur-md">
          {toast}
        </div>
      )}

      {/* Wallpaper */}
      <div className="absolute inset-0 z-0">
        {currentScreen === 'home' ? (
          <div className="absolute inset-0 bg-zinc-700" />
        ) : data.wallpaper ? (
          <img
            src={data.wallpaper}
            className="absolute inset-0 w-full h-full object-cover object-center"
            alt="wallpaper"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#f6f6f6] via-[#e6f6f6] to-[#e6f6f6]" />
        )}
      </div>

      {/* Screen Content */}
      <div className="relative z-10 min-h-screen w-full">
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && renderHome()}
          {currentScreen === 'chat_list' && renderChatList()}
          {currentScreen === 'chat' && renderChat()}
          {currentScreen === 'characters' && renderCharacters()}
          {currentScreen === 'self' && renderSelfProfile()}
          {currentScreen === 'worldbook' && renderWorldbook()}
          {currentScreen === 'stickers' && renderStickers()}
          {currentScreen === 'themes' && renderThemes()}
          {currentScreen === 'settings' && renderSettings()}
          {currentScreen === 'jump' && renderJump()}
          {currentScreen === 'work' && renderPlaceholder('打工')}
          {currentScreen === 'xianyu' && <XianyuApp showToast={showToast} />}
          {currentScreen === 'twitter' && renderTwitter()}
          {currentScreen === 'period' && renderPeriod()}
          {currentScreen === 'calendar' && renderPlaceholder('日历')}
          {currentScreen === 'backpack' && (
            <BackpackScreen
              data={data}
              setData={setData}
              setCurrentScreen={setCurrentScreen}
              showToast={showToast}
            />
          )}
          {currentScreen === 'tamagotchi' && renderTamagotchi()}
          {jumpChat && renderJumpChat()}
        </AnimatePresence>
        {/* Home Indicator */}
        <div className="absolute bottom-2 inset-x-0 h-1 flex justify-center z-50 pointer-events-none">
          <div className="w-32 h-1 bg-white/60 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

const pastelColors = [
  'bg-[var(--kawaii-pink)]',
  'bg-[var(--kawaii-pink2)]',
  'bg-[var(--kawaii-brown-light)]',
  'bg-[var(--kawaii-brown)]',
  'bg-[var(--kawaii-brown-dark)]',
  'bg-[var(--kawaii-white)]',
];
const AppIcon = ({ 
  id, icon, label, onClick, color, isEditing, 
  onPointerDown, onPointerMove, onPointerUp, onPointerLeave, 
  draggable, onDragStart, onDragOver, onDrop, hideLabel 
}: any) => {
  // 让每个icon有不同的马卡龙色
  const pastel = 'bg-pink-100';
  return (
    <motion.div 
      className="flex flex-col items-center gap-1.5 cursor-pointer group relative"
      onClick={(e) => { e.stopPropagation(); if (!isEditing) onClick(); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      animate={isEditing ? { rotate: [-2, 2, -2] } : { rotate: 0 }}
      transition={isEditing ? { repeat: Infinity, duration: 0.3, ease: "easeInOut", delay: Math.random() * 0.2 } : {}}
    >
      <div className={`w-[60px] h-[60px] rounded-[20px] ${pastel} flex items-center justify-center shadow-lg border border-[var(--kawaii-bg2)] backdrop-blur-xl ${!isEditing && 'group-active:scale-90'} transition-transform duration-200 pointer-events-none`} style={{boxShadow:'0 2px 8px 0 rgba(198,168,161,0.10)'}}>
        <span className="drop-shadow-[0_1px_2px_rgba(198,168,161,0.13)]">
          {React.cloneElement(icon, { size: 32, strokeWidth: 1.2, color: 'var(--kawaii-brown-dark,#5E4A44)' })}
        </span>
      </div>
      {!hideLabel && <span className="text-[11px]" style={{color:'var(--kawaii-brown-dark,#5E4A44)'}}>{label}</span>}
    </motion.div>
  );
};
