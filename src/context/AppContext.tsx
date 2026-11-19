import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutCustomer,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  CustomerNotification,
  DealershipSettings,
  Testimonial,
  UserProfile,
  Vehicle,
  WishlistItem,
} from '../types';
import { DEFAULT_DEALERSHIP_SETTINGS } from '../lib/format';
import { SAMPLE_PRESENTATION_VEHICLES } from '../data/sampleVehicles';

interface AppContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  settings: DealershipSettings;
  testimonials: Testimonial[];
  wishlist: WishlistItem[];
  notifications: CustomerNotification[];
  unreadNotificationsCount: number;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  toggleWishlist: (vehicle: Vehicle) => Promise<void>;
  isInWishlist: (vehicleId: string) => boolean;
  markNotificationRead: (notificationId: string) => Promise<void>;
  seedSampleInventory: () => Promise<void>;
  clearSampleInventory: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const BOOTSTRAP_ADMIN_EMAIL = 'usitakatelvin@gmail.com';

function normalizeTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  return new Date().toISOString();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [firestoreVehicles, setFirestoreVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [seedingInProgress, setSeedingInProgress] = useState(false);
  const [settings, setSettings] = useState<DealershipSettings>({
    ...DEFAULT_DEALERSHIP_SETTINGS,
    updatedAt: new Date().toISOString(),
  });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Auth listener & profile/admin sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setIsAdmin(false);
        setWishlist([]);
        setNotifications([]);
        setAuthReady(true);
        return;
      }

      try {
        // Check admin status
        const isBootstrap =
          firebaseUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL &&
          firebaseUser.emailVerified;
        let hasAdminDoc = false;
        try {
          const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
          hasAdminDoc = adminSnap.exists();
        } catch {
          hasAdminDoc = false;
        }
        setIsAdmin(Boolean(isBootstrap || hasAdminDoc));

        // Ensure user profile exists
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          const newProfile = {
            uid: firebaseUser.uid,
            fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Car Depot Customer',
            email: firebaseUser.email || '',
            phone: firebaseUser.phoneNumber || '',
            location: 'Lagos, Nigeria',
            whatsappOptIn: true,
            emailNotifications: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(profileRef, newProfile);
        }
      } catch (err) {
        console.error('Auth profile/admin initialization error:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Live UserProfile listener when signed in
  useEffect(() => {
    if (!authReady || !user) return;
    const path = `users/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUserProfile({
            uid: d.uid,
            fullName: d.fullName,
            email: d.email,
            phone: d.phone || '',
            location: d.location || '',
            whatsappOptIn: d.whatsappOptIn ?? true,
            emailNotifications: d.emailNotifications ?? true,
            createdAt: normalizeTimestamp(d.createdAt),
            updatedAt: normalizeTimestamp(d.updatedAt),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, path)
    );
    return () => unsub();
  }, [authReady, user]);

  // Public vehicles real-time subscription
  useEffect(() => {
    const q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Vehicle[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            slug: data.slug || d.id,
            referenceCode: data.referenceCode || d.id.slice(0, 8).toUpperCase(),
            name: data.name || `${data.year || ''} ${data.make || ''} ${data.model || ''}`.trim(),
            make: data.make || '',
            model: data.model || '',
            year: Number(data.year || 0),
            priceNgn: Number(data.priceNgn || 0),
            previousPriceNgn:
              typeof data.previousPriceNgn === 'number' ? data.previousPriceNgn : undefined,
            location: data.location || 'Lagos',
            condition: data.condition || 'Foreign Used',
            transmission: data.transmission || 'Automatic',
            fuelType: data.fuelType || 'Petrol',
            bodyType: data.bodyType || 'SUV',
            mileageKm: Number(data.mileageKm || 0),
            engineSize: data.engineSize || '',
            exteriorColor: data.exteriorColor || '',
            interiorColor: data.interiorColor || '',
            vin: data.vin || '',
            description: data.description || '',
            images: Array.isArray(data.images) ? data.images : [],
            verified: Boolean(data.verified),
            featured: Boolean(data.featured),
            financingAvailable: Boolean(data.financingAvailable),
            saveToOwnAvailable: Boolean(data.saveToOwnAvailable),
            status: data.status || 'available',
            popularityScore: Number(data.popularityScore || 0),
            isSampleInventory: Boolean(data.isSampleInventory),
            createdAt: normalizeTimestamp(data.createdAt),
            updatedAt: normalizeTimestamp(data.updatedAt),
          };
        });
        setFirestoreVehicles(list);
        setVehiclesLoading(false);
      },
      (err) => {
        setVehiclesLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'vehicles');
      }
    );
    return () => unsub();
  }, []);

  // Public dealership settings real-time subscription
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'dealership'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSettings({
            ...DEFAULT_DEALERSHIP_SETTINGS,
            ...d,
            updatedAt: normalizeTimestamp(d.updatedAt),
          });
        }
        setSettingsLoaded(true);
      },
      (err) => {
        setSettingsLoaded(true);
        handleFirestoreError(err, OperationType.GET, 'settings/dealership');
      }
    );
    return () => unsub();
  }, []);

  // Public published testimonials subscription
  useEffect(() => {
    const q = query(collection(db, 'testimonials'), where('published', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Testimonial[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            customerName: data.customerName,
            location: data.location,
            vehiclePurchased: data.vehiclePurchased,
            quote: data.quote,
            rating: Number(data.rating || 5),
            published: Boolean(data.published),
            createdAt: normalizeTimestamp(data.createdAt),
          };
        });
        setTestimonials(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
    );
    return () => unsub();
  }, []);

  // Authenticated customer wishlist subscription
  useEffect(() => {
    if (!authReady || !user) return;
    const path = `users/${user.uid}/wishlist`;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'wishlist'),
      (snap) => {
        setWishlist(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              vehicleId: data.vehicleId,
              vehicleName: data.vehicleName,
              priceNgn: Number(data.priceNgn || 0),
              createdAt: normalizeTimestamp(data.createdAt),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return () => unsub();
  }, [authReady, user]);

  // Authenticated customer notifications subscription
  useEffect(() => {
    if (!authReady || !user) return;
    const path = `users/${user.uid}/notifications`;
    const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              title: data.title,
              message: data.message,
              category: data.category,
              referenceNumber: data.referenceNumber,
              isRead: Boolean(data.isRead),
              createdAt: normalizeTimestamp(data.createdAt),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return () => unsub();
  }, [authReady, user]);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err?.message || 'Sign-in failed. Please allow popups and try again.');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutCustomer();
  }, []);

  const isInWishlist = useCallback(
    (vehicleId: string) => wishlist.some((item) => item.vehicleId === vehicleId),
    [wishlist]
  );

  const seedSampleInventory = useCallback(async () => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    for (const v of SAMPLE_PRESENTATION_VEHICLES) {
      const { id, createdAt: _c, updatedAt: _u, ...rest } = v;
      const payload: Record<string, any> = {
        ...rest,
        isSampleInventory: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (typeof payload.previousPriceNgn !== 'number') {
        delete payload.previousPriceNgn;
      }
      batch.set(doc(db, 'vehicles', id), payload, { merge: true });
    }
    batch.set(
      doc(db, 'settings', 'dealership'),
      {
        sampleInventorySeeded: true,
        sampleInventoryCleared: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await batch.commit();
  }, [isAdmin]);

  const clearSampleInventory = useCallback(async () => {
    if (!isAdmin) return;
    const snap = await getDocs(collection(db, 'vehicles'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      if (d.data()?.isSampleInventory === true || d.id.startsWith('sample_')) {
        batch.delete(d.ref);
      }
    });
    batch.set(
      doc(db, 'settings', 'dealership'),
      {
        sampleInventoryCleared: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await batch.commit();
  }, [isAdmin]);

  // Automatically sync presentation inventory into Firestore when admin first connects to an empty showroom
  useEffect(() => {
    if (
      !authReady ||
      !isAdmin ||
      vehiclesLoading ||
      !settingsLoaded ||
      seedingInProgress ||
      firestoreVehicles.length > 0 ||
      settings.sampleInventorySeeded ||
      settings.sampleInventoryCleared
    ) {
      return;
    }
    setSeedingInProgress(true);
    seedSampleInventory()
      .catch((err) => console.error('Auto-seed presentation inventory error:', err))
      .finally(() => setSeedingInProgress(false));
  }, [
    authReady,
    isAdmin,
    vehiclesLoading,
    settingsLoaded,
    seedingInProgress,
    firestoreVehicles.length,
    settings.sampleInventorySeeded,
    settings.sampleInventoryCleared,
    seedSampleInventory,
  ]);

  const vehicles =
    firestoreVehicles.length > 0
      ? firestoreVehicles
      : settings.sampleInventoryCleared
      ? []
      : SAMPLE_PRESENTATION_VEHICLES;

  const toggleWishlist = useCallback(
    async (vehicle: Vehicle) => {
      if (!user) {
        await loginWithGoogle();
        return;
      }
      const path = `users/${user.uid}/wishlist/${vehicle.id}`;
      const docRef = doc(db, 'users', user.uid, 'wishlist', vehicle.id);
      try {
        if (isInWishlist(vehicle.id)) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, {
            userId: user.uid,
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            priceNgn: vehicle.priceNgn,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          setAuthError('This listing is syncing with dealership inventory. Please try again shortly.');
          return;
        }
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [user, isInWishlist, loginWithGoogle]
  );

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/notifications/${notificationId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'notifications', notificationId), { isRead: true }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        authReady,
        isAdmin,
        vehicles,
        vehiclesLoading,
        settings,
        testimonials,
        wishlist,
        notifications,
        unreadNotificationsCount,
        loginWithGoogle,
        logout,
        toggleWishlist,
        isInWishlist,
        markNotificationRead,
        seedSampleInventory,
        clearSampleInventory,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
