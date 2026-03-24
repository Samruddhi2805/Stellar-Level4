import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import MainLayout from './components/Layout/MainLayout';
import OverviewTab from './components/Tabs/OverviewTab';
import SendTab from './components/Tabs/SendTab';
import RewardsTab from './components/Tabs/RewardsTab';
import HistoryTab from './components/Tabs/HistoryTab';
import SubscriptionTab from './components/Tabs/SubscriptionTab';
import WalletConnectModal from './components/Wallet/WalletConnectModal';
import { useAppStore } from './store/appStore';
import { connectFreighterWallet, loadWalletData } from './lib/stellar_Level4';

const App: React.FC = () => {
  const { 
    activeTab, 
    isConnected, 
    walletAddress, 
    setLoading, 
    setError,
    updateBalance,
    updateContractStats
  } = useAppStore();

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      try {
        // Try to auto-connect if wallet was previously connected
        if (localStorage.getItem('walletConnected') === 'true') {
          await connectFreighterWallet();
        }
        
        // Load initial contract stats
        await updateContractStats({
          volume: 0,
          payments: 0,
          activeUsers: 0,
          totalFees: 0,
          totalRewards: 0,
        });
      } catch (error) {
        console.error('App initialization error:', error);
        setError('Failed to initialize app');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      loadWalletData(walletAddress);
    }
  }, [isConnected, walletAddress]);

  const renderActiveTab = () => {
    if (!isConnected) {
      return <WalletConnectModal />;
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'send':
        return <SendTab />;
      case 'rewards':
        return <RewardsTab />;
      case 'history':
        return <HistoryTab />;
      case 'subscription':
        return <SubscriptionTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <MainLayout>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {renderActiveTab()}
      </motion.div>
    </MainLayout>
  );
};

export default App;
