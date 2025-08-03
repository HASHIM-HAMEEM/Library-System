import { create } from 'zustand';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  where,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface ScanLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  scan_type: 'entry' | 'exit';
  scan_time: string;
  location: string;
  scanned_by: string;
  status: 'success' | 'failed';
  result: 'granted' | 'denied';
  subscription_valid: boolean;
  qr_data?: string;
  error_message?: string;
}

interface ScanLogState {
  scanLogs: ScanLog[];
  todayLogs: ScanLog[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: any;
  
  // Stats
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  todayScans: number;
  
  // Actions
  fetchScanLogs: (limitCount?: number) => () => void;
  fetchMoreLogs: () => Promise<void>;
  fetchTodayLogs: () => () => void;
  addScanLog: (scanLog: Omit<ScanLog, 'id'>) => Promise<void>;
  fetchUserScanLogs: (userId: string) => Promise<ScanLog[]>;
  calculateStats: () => void;
  clearLogs: () => void;
}

export const useScanLogStore = create<ScanLogState>((set, get) => ({
  scanLogs: [],
  todayLogs: [],
  loading: false,
  error: null,
  hasMore: true,
  lastDoc: null,
  totalScans: 0,
  successfulScans: 0,
  failedScans: 0,
  todayScans: 0,

  fetchScanLogs: (limitCount = 50) => {
    set({ loading: true, error: null });
    
    const logsQuery = query(
      collection(db, 'scan_logs'),
      orderBy('scan_time', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(logsQuery,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ScanLog[];
        
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        set({ 
          scanLogs: logs, 
          loading: false,
          lastDoc: lastVisible,
          hasMore: snapshot.docs.length === limitCount
        });
        
        // Calculate stats
        get().calculateStats();
      },
      (error) => {
        console.error('Error fetching scan logs:', error);
        set({ error: error.message, loading: false });
        toast.error('Failed to fetch scan logs');
      }
    );

    return unsubscribe;
  },

  fetchMoreLogs: async () => {
    const { lastDoc, hasMore } = get();
    
    if (!hasMore || !lastDoc) return;

    set({ loading: true });

    try {
      const moreLogsQuery = query(
        collection(db, 'scan_logs'),
        orderBy('scan_time', 'desc'),
        startAfter(lastDoc),
        limit(25)
      );

      const snapshot = await getDocs(moreLogsQuery);
      const moreLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanLog[];

      const newLastDoc = snapshot.docs[snapshot.docs.length - 1];

      set((state) => ({
        scanLogs: [...state.scanLogs, ...moreLogs],
        lastDoc: newLastDoc,
        hasMore: snapshot.docs.length === 25,
        loading: false
      }));

    } catch (error: any) {
      console.error('Error fetching more logs:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load more logs');
    }
  },

  fetchTodayLogs: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const todayQuery = query(
      collection(db, 'scan_logs'),
      where('scan_time', '>=', todayISO),
      orderBy('scan_time', 'desc')
    );

    const unsubscribe = onSnapshot(todayQuery,
      (snapshot) => {
        const todayLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ScanLog[];
        
        set({ todayLogs, todayScans: todayLogs.length });
      },
      (error) => {
        console.error('Error fetching today logs:', error);
        toast.error('Failed to fetch today\'s logs');
      }
    );

    return unsubscribe;
  },

  addScanLog: async (scanLogData: Omit<ScanLog, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'scan_logs'), scanLogData);
      
      // The real-time listener will automatically update the state
      console.log('Scan log added with ID:', docRef.id);
      
    } catch (error: any) {
      console.error('Error adding scan log:', error);
      toast.error('Failed to log scan');
      throw error;
    }
  },

  fetchUserScanLogs: async (userId: string): Promise<ScanLog[]> => {
    try {
      const userLogsQuery = query(
        collection(db, 'scan_logs'),
        where('user_id', '==', userId),
        orderBy('scan_time', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(userLogsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanLog[];

    } catch (error: any) {
      console.error('Error fetching user scan logs:', error);
      toast.error('Failed to fetch user scan logs');
      return [];
    }
  },

  calculateStats: () => {
    const { scanLogs, todayLogs } = get();
    
    const totalScans = scanLogs.length;
    const successfulScans = scanLogs.filter(log => log.status === 'success').length;
    const failedScans = scanLogs.filter(log => log.status === 'failed').length;
    const todayScans = todayLogs.length;

    set({
      totalScans,
      successfulScans,
      failedScans,
      todayScans
    });
  },

  clearLogs: () => {
    set({
      scanLogs: [],
      todayLogs: [],
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      todayScans: 0,
      hasMore: true,
      lastDoc: null,
      error: null
    });
  },
}));