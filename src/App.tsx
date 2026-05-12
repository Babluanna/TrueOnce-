import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { UserProfile, AppConfig } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import UsageLimitOverlay from './components/UsageLimitOverlay';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'chat' | 'webbuilder' | 'admin'>('chat');

  useEffect(() => {
    const initApp = () => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser);

            // Test connection after auth
            try {
              const { getDocFromServer } = await import('firebase/firestore');
              await getDocFromServer(doc(db, 'config', 'connection_test'));
            } catch (e) {
              console.warn('Post-auth connection check (expected if new project):', e);
            }

            await syncProfile(firebaseUser);
            
            // Real-time config listener
            const configPath = 'config/main';
            onSnapshot(doc(db, configPath), (snap) => {
              if (snap.exists()) {
                setConfig(snap.data() as AppConfig);
              } else {
                const defaultConfig: AppConfig = {
                  appName: 'TrueOnce',
                  appIcon: '/logo.svg',
                  isJailbreakMode: false,
                  features: {
                    webBuilder: true,
                    chat: true,
                    feedback: true,
                  },
                  uiTheme: 'dark',
                };
                setConfig(defaultConfig);
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, configPath);
            });
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (error) {
          console.error('Auth synchronization error:', error);
          toast.error('Session error. Please refresh.');
        } finally {
          setLoading(false);
        }
      });
    };

    initApp();
  }, []);

  const syncProfile = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      let isFirst = false;
      try {
        const usersQuery = query(collection(db, 'users'), limit(1));
        const usersSnap = await getDocs(usersQuery);
        isFirst = usersSnap.empty;
      } catch (e) {
        console.warn('First-user check failed (Permission Denied). Assuming standard member.');
        isFirst = false;
      }

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Anonymous',
        photoURL: firebaseUser.photoURL || '',
        role: isFirst ? 'admin' : 'user',
        createdAt: Date.now(),
        lastLogin: Date.now(),
        totalUsageMs: 0,
        isLocked: false,
      };

      await setDoc(userRef, newProfile);
      setProfile(newProfile);
      
      if (isFirst) {
        toast.success('System Initialized: You are the Admin!', { duration: 5000 });
      }
    } else {
      const existingProfile = userDoc.data() as UserProfile;
      await updateDoc(userRef, { lastLogin: Date.now() });
      setProfile({ ...existingProfile, lastLogin: Date.now() });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-full mb-4"></div>
          <p className="font-mono text-sm opacity-50 tracking-widest uppercase">Initializing TrueOnce...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (profile?.isLocked) {
    return <UsageLimitOverlay profile={profile} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-orange-500/30">
      <Toaster position="top-right" />
      
      {view === 'admin' && profile?.role === 'admin' ? (
        <AdminPanel onBack={() => setView('chat')} profile={profile} />
      ) : (
        <Dashboard 
          profile={profile} 
          view={view} 
          setView={setView} 
          config={config}
        />
      )}
    </div>
  );
}
