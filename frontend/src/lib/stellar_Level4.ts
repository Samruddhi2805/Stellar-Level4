import * as Stellar from '@stellar/stellar-sdk';
import { useAppStore } from '../store/appStore';

const horizonUrl = 'https://horizon-testnet.stellar.org';
const server = new Stellar.Horizon.Server(horizonUrl);

export const connectFreighterWallet = async (): Promise<string> => {
  try {
    // Check if Freighter is available
    if (!window.freighterr) {
      throw new Error('Freighter wallet not found');
    }

    // Request access to wallet
    const { publicKey } = await window.freighterr.request({
      method: 'connect',
    });

    if (!publicKey) {
      throw new Error('Failed to connect wallet');
    }

    // Store connection state
    localStorage.setItem('walletConnected', 'true');
    localStorage.setItem('walletAddress', publicKey);

    const { connectWallet, updateBalance } = useAppStore.getState();
    connectWallet(publicKey);
    
    // Load initial balance
    const balance = await getXLMBalance(publicKey);
    updateBalance(balance);

    return publicKey;
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
};

export const loadWalletData = async (address: string) => {
  try {
    const { updateBalance, updateContractStats, updateTokenBalance, updateActivityStreak } = useAppStore.getState();
    
    // Load XLM balance
    const xlmBalance = await getXLMBalance(address);
    updateBalance(xlmBalance);
    
    // Load contract stats
    const stats = await getContractStats();
    updateContractStats(stats);
    
    // Load token balance
    const tokenBalance = await getTokenBalance(address);
    updateTokenBalance(tokenBalance);
    
    // Load activity streak
    const streak = await getActivityStreak(address);
    if (streak) {
      updateActivityStreak(streak);
    }
    
  } catch (error) {
    console.error('Error loading wallet data:', error);
  }
};

export const getXLMBalance = async (address: string): Promise<number> => {
  try {
    const account = await server.loadAccount(address);
    const xlmBalance = account.balances.find(
      (balance: any) => balance.asset_type === 'native'
    );
    
    return parseFloat(xlmBalance?.balance || '0');
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

export const getTokenBalance = async (_address: string): Promise<number> => {
  try {
    // This would call the token contract to get balance
    // For now, return a mock value
    return 1000;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
};

export const getActivityStreak = async (address: string) => {
  try {
    // This would call the reward contract to get activity streak
    // For now, return a mock value
    return {
      user: address,
      current_streak: 5,
      longest_streak: 10,
      last_activity: Date.now() - 86400000, // 1 day ago
      total_activities: 25,
    };
  } catch (error) {
    console.error('Error fetching activity streak:', error);
    return null;
  }
};

export const getContractStats = async () => {
  try {
    // This would call the payment contract to get stats
    // For now, return mock values
    return {
      volume: 50000000, // 5 XLM in stroops
      payments: 150,
      activeUsers: 45,
      totalFees: 150000, // 0.015 XLM
      totalRewards: 500000, // 0.05 XLM
    };
  } catch (error) {
    console.error('Error fetching contract stats:', error);
    return {
      volume: 0,
      payments: 0,
      activeUsers: 0,
      totalFees: 0,
      totalRewards: 0,
    };
  }
};

export const sendPayment = async (
  fromAddress: string,
  toAddress: string,
  amount: number,
  paymentType: 'single' | 'split' | 'recurring' = 'single',
  splits?: Array<{ address: string; percentage: number }>
) => {
  try {
    if (!window.freighterr) {
      throw new Error('Freighter wallet not connected');
    }

    // Load the sender account
    const account = await server.loadAccount(fromAddress);
    
    // Convert amount to stroops
    const amountInStroops = Math.floor(amount * 10000000);
    
    let transactionBuilder: Stellar.TransactionBuilder;
    
    if (paymentType === 'single') {
      // Simple payment
      transactionBuilder = new Stellar.TransactionBuilder(account, {
        fee: Stellar.BASE_FEE,
        networkPassphrase: Stellar.Networks.TESTNET,
      })
        .addOperation(
          Stellar.Operation.payment({
            destination: toAddress,
            asset: Stellar.Asset.native(),
            amount: amountInStroops.toString(),
          })
        );
    } else if (paymentType === 'split' && splits) {
      // Split payments
      transactionBuilder = new Stellar.TransactionBuilder(account, {
        fee: (Stellar.BASE_FEE * splits.length).toString(),
        networkPassphrase: Stellar.Networks.TESTNET,
      });
      
      splits.forEach((split) => {
        const splitAmount = Math.floor((amountInStroops * split.percentage) / 100);
        transactionBuilder.addOperation(
          Stellar.Operation.payment({
            destination: split.address,
            asset: Stellar.Asset.native(),
            amount: splitAmount.toString(),
          })
        );
      });
    } else {
      throw new Error('Invalid payment type');
    }

    const transaction = transactionBuilder.setTimeout(30).build();

    // Sign transaction with Freighter
    const signedXDR = await window.freighterr.request({
      method: 'signTransaction',
      params: { xdr: transaction.toXDR() },
    });

    // Submit transaction
    const result = await server.submitTransaction(signedXDR);
    
    return {
      hash: result.hash,
      success: true,
    };
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
};

export const createRecurringPayment = async (
  fromAddress: string,
  toAddress: string,
  amount: number,
  interval: 'daily' | 'weekly' | 'monthly',
  count: number
) => {
  try {
    // This would call the payment contract to create recurring payment
    // For now, simulate the creation
    const paymentId = `rec_${Date.now()}`;
    
    return {
      id: paymentId,
      fromAddress,
      toAddress,
      amount,
      interval,
      count,
      nextPayment: Date.now() + getIntervalSeconds(interval) * 1000,
    };
  } catch (error) {
    console.error('Error creating recurring payment:', error);
    throw error;
  }
};

const getIntervalSeconds = (interval: string): number => {
  switch (interval) {
    case 'daily': return 86400;
    case 'weekly': return 604800;
    case 'monthly': return 2592000;
    default: return 86400;
  }
};

export const subscribeToTier = async (
  _userAddress: string,
  _tierName: string
): Promise<{ success: boolean; subscriptionEnd?: number }> => {
  try {
    // This would call the payment contract for subscription
    // For now, simulate subscription
    const subscriptionEnd = Date.now() + 2592000000; // 30 days
    
    return {
      success: true,
      subscriptionEnd,
    };
  } catch (error) {
    console.error('Error subscribing to tier:', error);
    return { success: false };
  }
};

export const claimReward = async (
  _userAddress: string,
  rewardType: string
): Promise<{ success: boolean; amount?: number }> => {
  try {
    // This would call the reward contract
    // For now, simulate reward claim
    const amount = rewardType === 'daily_activity' ? 1000 : 5000; // stroops
    
    return {
      success: true,
      amount,
    };
  } catch (error) {
    console.error('Error claiming reward:', error);
    return { success: false };
  }
};

export const createReferralCode = async (_userAddress: string): Promise<string> => {
  try {
    // This would call the token contract
    // For now, generate a simple code
    return `STELLAR${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  } catch (error) {
    console.error('Error creating referral code:', error);
    throw error;
  }
};

export const claimReferralReward = async (
  _referrerAddress: string,
  _refereeAddress: string,
  _referralCode: string
): Promise<{ success: boolean; amount?: number }> => {
  try {
    // This would call the token contract
    // For now, simulate referral reward
    return {
      success: true,
      amount: 10000, // 0.001 XLM
    };
  } catch (error) {
    console.error('Error claiming referral reward:', error);
    return { success: false };
  }
};

// Type declarations for Freighter
declare global {
  interface Window {
    freighterr?: {
      request: (params: { method: string; params?: any }) => Promise<any>;
    };
  }
}
