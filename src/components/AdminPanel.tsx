import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, orderBy, limit, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { 
  Users, Settings, ShieldAlert, Activity, Layout, Palette, ArrowLeft, 
  Trash2, Save, Check, Ban, Search, AppWindow, ToggleLeft, ToggleRight,
  Info, Clock, Mail, Menu, Copy, Eye, EyeOff, Key, ListFilter, UserPlus, UserMinus
} from 'lucide-react';
import { UserProfile, AppConfig, UserFeedback, UsageLog, AdminAuditLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { auth as firebaseAuth } from '../lib/firebase';

interface AdminPanelProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function AdminPanel({ onBack, profile }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'branding' | 'features' | 'ui' | 'monitoring' | 'security' | 'keys' | 'audit'>('users');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [managedKey, setManagedKey] = useState('');
  
  // Data State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
    toast.success('Copied to clipboard');
  };

  const logAuditAction = async (action: string, target?: string, details?: string) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        adminId: profile.uid,
        adminEmail: profile.email,
        action,
        target,
        details,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  };

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    // Real-time subscriptions
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setLogs(snap.docs.map(doc => doc.data() as UsageLog));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    const unsubAuditLogs = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setAuditLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AdminAuditLog));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
    });

    const unsubFeedback = onSnapshot(query(collection(db, 'feedback'), orderBy('timestamp', 'desc')), (snap) => {
      setFeedback(snap.docs.map(doc => doc.data() as UserFeedback));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'feedback');
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppConfig;
        setConfig(data);
        setManagedKey(data.geminiApiKey || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/main');
    });

    return () => {
      unsubUsers();
      unsubLogs();
      unsubAuditLogs();
      unsubFeedback();
      unsubConfig();
    };
  }, []);

  const updateConfig = async (updates: Partial<AppConfig>) => {
    setLoading(true);
    try {
      const oldKeys = config ? Object.keys(updates).filter(k => (config as any)[k] !== (updates as any)[k]) : [];
      await setDoc(doc(db, 'config', 'main'), updates, { merge: true });
      
      // Log audit
      if (oldKeys.includes('geminiApiKey')) {
        logAuditAction('apiKey_update', 'config/main', 'Managed Gemini API Key updated');
      } else if (oldKeys.includes('features')) {
        const changedFeatures = Object.keys(updates.features || {}).join(', ');
        logAuditAction('feature_toggle', 'config/main', `Features toggled: ${changedFeatures}`);
      } else {
        logAuditAction('config_update', 'config/main', `Updated: ${oldKeys.join(', ')}`);
      }
      
      toast.success('Configuration updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/main');
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAt = async (targetUser: UserProfile) => {
    if (!confirm(`Are you sure you want to delete ${targetUser.email}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'users', targetUser.uid));
      logAuditAction('user_delete', targetUser.uid, `Deleted user: ${targetUser.email}`);
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const toggleUserRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role of ${targetUser.email} to ${newRole}?`)) return;
    
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
      logAuditAction('role_change', targetUser.uid, `Changed role of ${targetUser.email} to ${newRole}`);
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const menuItems = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'branding', label: 'Branding', icon: AppWindow },
    { id: 'features', label: 'Features', icon: Settings },
    { id: 'ui', label: 'UI/UX', icon: Palette },
    { id: 'keys', label: 'Gemini API', icon: Key },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'audit', label: 'Audit Log', icon: ListFilter },
    { id: 'security', label: 'Security', icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden relative">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-[60]">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-orange-500 text-white rounded-full shadow-lg"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Admin Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col p-4 transition-transform duration-300 transform lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-8 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">HQ Panel</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === item.id ? "bg-orange-500 text-white font-bold" : "text-neutral-500 hover:bg-neutral-800"
              )}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-8">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight capitalize">{activeTab} Management</h2>
            <p className="text-neutral-500 text-sm mt-1">Configure system-wide parameters and monitor user activity.</p>
          </div>
          <div className="flex items-center gap-4 bg-neutral-900/50 p-4 rounded-3xl border border-neutral-800 self-start md:self-auto">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-neutral-500">Global State</p>
              <p className="text-sm font-bold text-green-500">Systems Operational</p>
            </div>
            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
              <Check className="text-green-500" size={20} />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800">
                  <p className="text-neutral-500 text-xs font-bold uppercase mb-2">Total Members</p>
                  <p className="text-4xl font-black">{users.length}</p>
                </div>
                <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800">
                  <p className="text-neutral-500 text-xs font-bold uppercase mb-2">Active Sessions</p>
                  <p className="text-4xl font-black">{users.filter(u => Date.now() - u.lastLogin < 600000).length}</p>
                </div>
                <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 sm:col-span-2 lg:col-span-1">
                  <p className="text-neutral-500 text-xs font-bold uppercase mb-2">Support Tickets</p>
                  <p className="text-4xl font-black">{feedback.length}</p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-x-auto shadow-xl">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-neutral-800/50 text-[10px] uppercase font-bold text-neutral-400">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Active</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {users.map(u => (
                      <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-8 h-8 rounded-full bg-neutral-800" />
                            <div>
                              <p className="text-sm font-bold">{u.displayName}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-neutral-500">{u.email}</p>
                                <button
                                  onClick={() => handleCopy(u.email)}
                                  className="text-neutral-600 hover:text-white transition-colors"
                                  title="Copy email"
                                >
                                  {copiedText === u.email ? <Check size={10} /> : <Copy size={10} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleUserRole(u)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 transition-all",
                              u.role === 'admin' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20"
                            )}
                          >
                            {u.role === 'admin' ? <UserMinus size={10} /> : <UserPlus size={10} />}
                            {u.role}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", Date.now() - u.lastLogin < 600000 ? "bg-green-500 animate-pulse" : "bg-neutral-700")} />
                            <span className="text-xs">{Date.now() - u.lastLogin < 600000 ? 'Online' : 'Offline'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                          {new Date(u.lastLogin).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteUserAt(u)}
                            disabled={u.role === 'admin' && u.uid === profile?.uid}
                            className="p-2 text-neutral-500 hover:text-red-500 disabled:opacity-0 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'branding' && (
            <motion.div key="branding" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-8">
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Application Name</label>
                  <input 
                    type="text" 
                    defaultValue={config?.appName} 
                    onBlur={(e) => updateConfig({ appName: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">App Icon URL</label>
                  <input 
                    type="text" 
                    defaultValue={config?.appIcon}
                    onBlur={(e) => updateConfig({ appIcon: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all" 
                  />
                </div>
                <div className="flex items-center gap-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                  <div className="p-3 bg-orange-500 rounded-xl">
                    <AppWindow size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold">Visual Branding</h4>
                    <p className="text-xs text-neutral-500">These changes reflect globally for all users instantly.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div key="features" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-4">
              {config && Object.entries(config.features).map(([key, val]) => (
                <div key={key} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                    <p className="text-xs text-neutral-500">Toggle availability of this module for all users.</p>
                  </div>
                  <button 
                    onClick={() => updateConfig({ features: { ...config.features, [key as any]: !val } })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      val ? "bg-orange-500" : "bg-neutral-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all",
                      val ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'ui' && (
            <motion.div key="ui" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl grid grid-cols-2 gap-6">
              {['dark', 'light', 'system'].map(theme => (
                <button
                  key={theme}
                  onClick={() => updateConfig({ uiTheme: theme as any })}
                  className={cn(
                    "p-8 rounded-3xl border-2 transition-all text-center group",
                    config?.uiTheme === theme ? "bg-orange-500/10 border-orange-500" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all",
                    config?.uiTheme === theme ? "bg-orange-500 text-white" : "bg-neutral-800 text-neutral-500 group-hover:text-white"
                  )}>
                    <Palette size={24} />
                  </div>
                  <h4 className="font-bold capitalize">{theme} Theme</h4>
                  <p className="text-xs text-neutral-500 mt-1">Apply global app aesthetic</p>
                </button>
              ))}
            </motion.div>
          )}

          {activeTab === 'monitoring' && (
            <motion.div key="monitoring" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-orange-500" /> Live Activity Logs</h3>
                  <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded border border-blue-500/20">Auto-refreshing</span>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-800 text-[10px] uppercase font-bold text-neutral-500">
                      <tr>
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Prompt</th>
                        <th className="px-6 py-3">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {logs.map((log, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-neutral-300">{log.userEmail}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2 group/log">
                              <p className="text-xs text-neutral-400 line-clamp-2 italic flex-1">"{log.prompt}"</p>
                              <button
                                onClick={() => handleCopy(log.prompt)}
                                className="opacity-0 group-hover/log:opacity-100 text-neutral-600 hover:text-white transition-all"
                                title="Copy prompt"
                              >
                                {copiedText === log.prompt ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded uppercase text-neutral-500">{log.mode}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keys' && (
            <motion.div key="keys" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-16 -mt-16 rounded-full blur-3xl transition-all" />
                
                 <div className="flex items-center gap-4 mb-2 relative z-10">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
                    <Key size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Gemini API Configuration</h3>
                    <p className="text-xs text-neutral-500">Securely manage your Google Gemini credentials.</p>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase">Primary Gemini Key</label>
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        Get Key <Info size={10} />
                      </a>
                    </div>
                    <div className="relative group">
                      <input 
                        type={showApiKey ? "text" : "password"} 
                        value={managedKey}
                        onChange={(e) => setManagedKey(e.target.value)}
                        placeholder={config?.geminiApiKey ? "••••••••••••••••" : "Paste your GEMINI_API_KEY here..."}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 pr-12 text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono group-hover:border-neutral-600" 
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl space-y-2">
                    <p className="text-[10px] text-neutral-400 leading-relaxed uppercase font-bold tracking-wider">Storage Policy</p>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Custom keys stored here are encrypted in Firestore and take precedence over environment variables. Changes are applied instantly across all active sessions.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => updateConfig({ geminiApiKey: managedKey })}
                  disabled={loading || managedKey === (config?.geminiApiKey || '')}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save API Configuration
                </button>
              </div>

              {/* Status Indicator Panel */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    config?.geminiApiKey ? "bg-green-500 animate-pulse" : "bg-neutral-700"
                  )} />
                  <div>
                    <p className="text-xs font-bold uppercase text-neutral-500">Service Status</p>
                    <p className="text-sm">{config?.geminiApiKey ? "Custom Client Active" : "Using System Default"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-neutral-600 uppercase">Latency</p>
                  <p className="text-sm font-mono text-neutral-400">Normal</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2"><ListFilter size={18} className="text-blue-500" /> Admin Audit Logs</h3>
                  <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded border border-blue-500/20">System Records</span>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-800 text-[10px] uppercase font-bold text-neutral-500">
                      <tr>
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3">Admin</th>
                        <th className="px-6 py-3">Action</th>
                        <th className="px-6 py-3">Target/Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-neutral-300">{log.adminEmail}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                              log.action.includes('delete') ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                              log.action.includes('role') ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                              "bg-neutral-800 text-neutral-400 border border-neutral-700"
                            )}>
                              {log.action.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              {log.target && <p className="text-[10px] text-neutral-500 font-mono">ID: {log.target}</p>}
                              <p className="text-xs text-neutral-400 italic break-words">{log.details}</p>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-neutral-600 italic">No audit records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl space-y-6">
              <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-3xl space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-500 rounded-2xl shadow-lg shadow-red-500/20">
                    <ShieldAlert size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-500">Advanced AI Control</h3>
                    <p className="text-xs text-neutral-500">Manage critical system safety overrides.</p>
                  </div>
                </div>

                <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">System Jailbreak Mode</h4>
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-tighter">Warning: Disables core AI safety filters globally.</p>
                  </div>
                  <button 
                    onClick={() => updateConfig({ isJailbreakMode: !config?.isJailbreakMode })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all",
                      config?.isJailbreakMode ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-neutral-800 text-neutral-500"
                    )}
                  >
                    {config?.isJailbreakMode ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-left hover:border-neutral-700 transition-all">
                    <Ban size={18} className="text-red-500 mb-2" />
                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Emergency</p>
                    <p className="font-bold text-sm">Global Lock</p>
                  </button>
                  <button className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-left hover:border-neutral-700 transition-all">
                    <Search size={18} className="text-blue-500 mb-2" />
                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Analytics</p>
                    <p className="font-bold text-sm">Audit Trails</p>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
