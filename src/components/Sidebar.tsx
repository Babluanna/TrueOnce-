import { 
  LayoutDashboard, MessageSquare, Code, ShieldCheck, LogOut, ChevronLeft, ChevronRight, 
  MessageCircleQuestion, Clock, Plus, History, MessageCircle, Trash2 
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, AppConfig, Conversation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';

interface SidebarProps {
  profile: UserProfile | null;
  currentView: string;
  setView: (view: 'chat' | 'webbuilder' | 'admin') => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onFeedbackOpen: () => void;
  timeLeft: string;
  config: AppConfig | null;
  activeConversationId: string | null;
  onConversationSelect: (id: string, mode: string) => void;
}

export default function Sidebar({ 
  profile, currentView, setView, isOpen, setIsOpen, onFeedbackOpen, timeLeft, config,
  activeConversationId, onConversationSelect
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'users', profile.uid, 'conversations'),
      orderBy('lastMessageAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${profile.uid}/conversations`);
    });

    return () => unsub();
  }, [profile]);
  const menuItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, enabled: config?.features.chat },
    { id: 'webbuilder', label: 'WebBuilder', icon: Code, enabled: config?.features.webBuilder },
  ];

  return (
    <motion.div 
      animate={{ width: isOpen ? 260 : 80 }}
      className="h-full bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div 
              key="logo-full" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
            >
              <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center shrink-0 border border-neutral-700/50 p-1">
                <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-xl tracking-tight">{config?.appName || 'TrueOnce'}</span>
            </motion.div>
          ) : (
            <motion.div 
              key="logo-small" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center mx-auto border border-neutral-700/50 p-1.5"
            >
              <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        <div className="mb-2 px-3 py-2">
          <p className={cn("text-[10px] font-bold uppercase text-neutral-500 tracking-wider transition-opacity", !isOpen && "opacity-0")}>Navigation</p>
        </div>
        
        {menuItems.filter(i => i.enabled).map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
              (currentView === item.id && !activeConversationId) ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={18} className={cn((currentView === item.id && !activeConversationId) ? "text-orange-500" : "group-hover:text-orange-500")} />
            {isOpen && <span className="font-medium text-sm">{item.label}</span>}
          </button>
        ))}

        {isOpen && (
          <div className="mt-8 space-y-2">
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">History</p>
              <button 
                onClick={() => {
                  setView(currentView as any);
                  onConversationSelect('', currentView);
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors text-orange-500"
                title="New Chat"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div key={conv.id} className="group/item relative">
                    <button
                      onClick={() => onConversationSelect(conv.id, conv.mode)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all",
                        activeConversationId === conv.id ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                      )}
                    >
                      {conv.mode === 'webbuilder' ? <Code size={14} className="shrink-0" /> : <MessageCircle size={14} className="shrink-0" />}
                      <span className="text-xs truncate font-medium flex-1">{conv.title || 'New Chat'}</span>
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) {
                          await deleteDoc(doc(db, 'users', profile!.uid, 'conversations', conv.id));
                          if (activeConversationId === conv.id) {
                            onConversationSelect('', conv.mode);
                          }
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-600 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-[10px] text-neutral-600 italic">No past chats yet</p>
              )}
            </div>
          </div>
        )}

        {profile?.role === 'admin' && (
          <div className="mt-auto pt-4">
            <button
              onClick={() => setView('admin')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                currentView === 'admin' ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <ShieldCheck size={18} className={cn(currentView === 'admin' ? "text-orange-500" : "group-hover:text-orange-500")} />
              {isOpen && <span className="font-medium text-sm">Admin Panel</span>}
            </button>
          </div>
        )}
      </div>

      <div className="px-3 pb-6 space-y-2">
        {profile?.role !== 'admin' && (
          <div className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 mb-4 overflow-hidden",
            !isOpen && "justify-center px-0"
          )}>
            <Clock size={18} className="shrink-0" />
            {isOpen && <span className="text-sm font-mono font-bold">{timeLeft}</span>}
          </div>
        )}

        <button
          onClick={onFeedbackOpen}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-all group relative",
            !isOpen && "justify-center"
          )}
        >
          <MessageCircleQuestion size={20} />
          {isOpen && <span className="font-medium">Feedback</span>}
        </button>

        <button
          onClick={() => auth.signOut()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-neutral-400 hover:bg-red-500/10 hover:text-red-500 transition-all group relative border border-transparent hover:border-red-500/20",
            !isOpen && "justify-center"
          )}
        >
          <LogOut size={20} />
          {isOpen && <span className="font-medium">Sign Out</span>}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:flex w-full items-center justify-center p-2 text-neutral-600 hover:text-white transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </motion.div>
  );
}

