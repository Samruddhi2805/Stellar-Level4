import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Gift, History, Crown, Menu, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, walletAddress, isConnected } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'send', name: 'Send', icon: Wallet },
    { id: 'rewards', name: 'Rewards', icon: Gift },
    { id: 'history', name: 'History', icon: History },
    { id: 'subscription', name: 'Subscription', icon: Crown },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-stellar-400 to-stellar-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">StellarPay</h1>
              <p className="text-xs text-gray-400">Level 4 DApp</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`relative px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-stellar-500/20 text-stellar-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                  {activeTab === item.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-stellar-400"
                      layoutId="activeTab"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Wallet Status */}
          <motion.div
            className="hidden md:flex items-center space-x-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {isConnected ? (
              <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300 font-mono">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/30">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-sm text-red-400">Not Connected</span>
              </div>
            )}
          </motion.div>

          {/* Mobile menu button */}
          <motion.button
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden py-4 border-t border-white/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-stellar-500/20 text-stellar-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </motion.button>
                );
              })}
              
              {/* Mobile Wallet Status */}
              <div className="pt-2 border-t border-white/10">
                {isConnected ? (
                  <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-300 font-mono">
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/30">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-red-400">Not Connected</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
