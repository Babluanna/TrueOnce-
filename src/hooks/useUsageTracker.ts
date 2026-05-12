import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';

const USAGE_LIMIT_MS = 30 * 60 * 1000;
const COOLDOWN_MS = 60 * 60 * 1000;

export function useUsageTracker(profile: UserProfile | null) {
  const [timeLeft, setTimeLeft] = useState(USAGE_LIMIT_MS / 1000);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const userRef = doc(db, 'users', profile.uid);

    // Initial state setup
    const checkStatus = async () => {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const lockedAt = data.lockedAt || 0;
          const totalUsed = data.totalUsageMs || 0;

          if (data.isLocked) {
            const sinceLock = Date.now() - lockedAt;
            if (sinceLock >= COOLDOWN_MS) {
              // Unlock
              await updateDoc(userRef, {
                isLocked: false,
                totalUsageMs: 0,
                lockedAt: null
              });
              setIsLocked(false);
            } else {
              setIsLocked(true);
              setCooldownLeft(Math.ceil((COOLDOWN_MS - sinceLock) / 1000));
            }
          } else {
            setIsLocked(false);
            setTimeLeft(Math.max(0, Math.ceil((USAGE_LIMIT_MS - totalUsed) / 1000)));
          }
        }
      } catch (e) {
        console.warn('Status check failed:', e);
      }
    };

    checkStatus();

    // Listen for changes
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsLocked(data.isLocked || false);
        if (data.isLocked) {
          const sinceLock = Date.now() - (data.lockedAt || 0);
          setCooldownLeft(Math.max(0, Math.ceil((COOLDOWN_MS - sinceLock) / 1000)));
        } else {
          const used = data.totalUsageMs || 0;
          setTimeLeft(Math.max(0, Math.ceil((USAGE_LIMIT_MS - used) / 1000)));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${profile.uid}`);
    });

    // Tracking interval
    const interval = setInterval(async () => {
      if (profile.role === 'admin') return; // Admins have unlimited usage
      if (isLocked) {
        setCooldownLeft((prev) => {
          if (prev <= 1) {
            checkStatus(); // Re-verify lock status
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      // If active (this is a simple heuristic: if dashboard is open and not locked)
      const snap = await getDoc(userRef);
      const data = snap.data();
      if (!data) return;

      if (!data.isLocked) {
        const newTotal = (data.totalUsageMs || 0) + 10000;
        if (newTotal >= USAGE_LIMIT_MS) {
          await updateDoc(userRef, {
            totalUsageMs: newTotal,
            isLocked: true,
            lockedAt: Date.now()
          });
        } else {
          await updateDoc(userRef, { totalUsageMs: newTotal });
        }
      }
    }, 10000); // Update every 10s to save on Firestore writes but keep it real-time enough

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [profile?.uid, profile?.role, isLocked]);

  return { timeLeft, cooldownLeft, isLocked };
}
