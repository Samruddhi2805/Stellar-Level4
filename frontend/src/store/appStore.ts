import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface PaymentRecord {
  sender: string;
  receiver: string;
  amount: number;
  fee_amount: number;
  cashback_amount: number;
  timestamp: number;
  transaction_id: string;
  split_payments: Array<{
    receiver: string;
    amount: number;
    percentage: number;
  }>;
}

export interface RewardRecord {
  user: string;
  reward_type: string;
  amount: number;
  transaction_id: string;
  timestamp: number;
  claimed: boolean;
}

export interface ActivityStreak {
  user: string;
  current_streak: number;
  longest_streak: number;
  last_activity: number;
  total_activities: number;
}

export interface AppState {
  // Wallet state
  walletAddress: string | null;
  balance: number;
  isConnected: boolean;
  
  // Transaction state
  transactions: PaymentRecord[];
  pendingTransaction: boolean;
  
  // Contract state
  totalVolume: number;
  totalPayments: number;
  contractStats: {
    volume: number;
    payments: number;
    activeUsers: number;
    totalFees: number;
    totalRewards: number;
  };
  
  // Rewards state
  userRewards: RewardRecord[];
  activityStreak: ActivityStreak | null;
  tokenBalance: number;
  
  // Fee state
  currentFeeRate: number;
  feeDiscounts: Array<{
    user: string;
    discount_rate: number;
    valid_until: number;
    reason: string;
  }>;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  activeTab: 'overview' | 'send' | 'rewards' | 'history' | 'subscription';
  
  // Real-time updates
  liveTransactions: PaymentRecord[];
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    timestamp: number;
  }>;
}

export interface AppActions {
  // Wallet actions
  connectWallet: (address: string) => void;
  disconnectWallet: () => void;
  updateBalance: (balance: number) => void;
  
  // Transaction actions
  addTransaction: (transaction: PaymentRecord) => void;
  setPendingTransaction: (pending: boolean) => void;
  
  // Contract actions
  updateContractStats: (stats: Partial<AppState['contractStats']>) => void;
  
  // Rewards actions
  addReward: (reward: RewardRecord) => void;
  updateActivityStreak: (streak: ActivityStreak) => void;
  updateTokenBalance: (balance: number) => void;
  
  // Fee actions
  updateFeeRate: (rate: number) => void;
  addFeeDiscount: (discount: AppState['feeDiscounts'][0]) => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  
  // Real-time actions
  addLiveTransaction: (transaction: PaymentRecord) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  
  // Reset actions
  resetState: () => void;
}

const initialState: AppState = {
  walletAddress: null,
  balance: 0,
  isConnected: false,
  transactions: [],
  pendingTransaction: false,
  totalVolume: 0,
  totalPayments: 0,
  contractStats: {
    volume: 0,
    payments: 0,
    activeUsers: 0,
    totalFees: 0,
    totalRewards: 0,
  },
  userRewards: [],
  activityStreak: null,
  tokenBalance: 0,
  currentFeeRate: 0,
  feeDiscounts: [],
  isLoading: false,
  error: null,
  activeTab: 'overview',
  liveTransactions: [],
  notifications: [],
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Wallet actions
      connectWallet: (address) => set({ walletAddress: address, isConnected: true }),
      disconnectWallet: () => set({ 
        walletAddress: null, 
        isConnected: false, 
        balance: 0,
        transactions: [],
        userRewards: [],
        activityStreak: null,
        tokenBalance: 0,
      }),
      updateBalance: (balance) => set({ balance }),
      
      // Transaction actions
      addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions].slice(0, 50)
      })),
      setPendingTransaction: (pending) => set({ pendingTransaction: pending }),
      
      // Contract actions
      updateContractStats: (stats) => set((state) => ({
        contractStats: { ...state.contractStats, ...stats }
      })),
      
      // Rewards actions
      addReward: (reward) => set((state) => ({
        userRewards: [reward, ...state.userRewards].slice(0, 100)
      })),
      updateActivityStreak: (streak) => set({ activityStreak: streak }),
      updateTokenBalance: (balance) => set({ tokenBalance: balance }),
      
      // Fee actions
      updateFeeRate: (rate) => set({ currentFeeRate: rate }),
      addFeeDiscount: (discount) => set((state) => ({
        feeDiscounts: [discount, ...state.feeDiscounts].slice(0, 50)
      })),
      
      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Real-time actions
      addLiveTransaction: (transaction) => set((state) => ({
        liveTransactions: [transaction, ...state.liveTransactions].slice(0, 20)
      })),
      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          },
          ...state.notifications,
        ].slice(0, 10)
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      // Reset actions
      resetState: () => set(initialState),
    }),
    {
      name: 'stellar-payment-store',
    }
  )
);

// Selectors for commonly used state combinations
export const useWalletState = () => {
  const { walletAddress, balance, isConnected } = useAppStore();
  return { walletAddress, balance, isConnected };
};

export const useTransactionState = () => {
  const { transactions, pendingTransaction, addTransaction, setPendingTransaction } = useAppStore();
  return { transactions, pendingTransaction, addTransaction, setPendingTransaction };
};

export const useRewardState = () => {
  const { userRewards, activityStreak, tokenBalance, addReward, updateActivityStreak, updateTokenBalance } = useAppStore();
  return { userRewards, activityStreak, tokenBalance, addReward, updateActivityStreak, updateTokenBalance };
};

export const useUIState = () => {
  const { isLoading, error, activeTab, setLoading, setError, setActiveTab } = useAppStore();
  return { isLoading, error, activeTab, setLoading, setError, setActiveTab };
};

export const useRealTimeState = () => {
  const { liveTransactions, notifications, addLiveTransaction, addNotification, removeNotification } = useAppStore();
  return { liveTransactions, notifications, addLiveTransaction, addNotification, removeNotification };
};
