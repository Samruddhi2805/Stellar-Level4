import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const WalletConnectModal: React.FC = () => {
  const { connectWallet, setLoading, isLoading } = useAppStore();

  const handleConnect = async () => {
    setLoading(true);
    try {
      // This would integrate with the actual wallet connection logic
      // await connectWallet();
      console.log('Connecting wallet...');
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Secure & Decentralized',
      description: 'Your keys, your crypto. Non-custodial wallet integration.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Stellar network ensures 3-5 second transaction times.',
    },
    {
      icon: Users,
      title: 'Smart Rewards',
      description: 'Earn cashbacks and rewards on every transaction.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex p-4 bg-gradient-to-br from-stellar-500 to-purple-600 rounded-2xl mb-6"
          >
            <Wallet className="w-12 h-12 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-white mb-4"
          >
            Welcome to StellarPay
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto"
          >
            The next-generation payment DApp on Stellar with smart fees, instant cashbacks, 
            and advanced features for seamless transactions.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleConnect}
            disabled={isLoading}
            className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-stellar-500 to-stellar-600 hover:from-stellar-600 hover:to-stellar-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Connect Freighter Wallet</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-stellar-500/30 transition-all duration-200"
              >
                <div className="p-3 bg-stellar-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-stellar-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-gradient-to-r from-stellar-500/10 to-purple-500/10 backdrop-blur-xl rounded-xl border border-stellar-500/20 p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-stellar-400 mb-1">3-5s</p>
              <p className="text-gray-400">Transaction Time</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-400 mb-1">1%</p>
              <p className="text-gray-400">Cashback Rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-400 mb-1">0.00001</p>
              <p className="text-gray-400">Min Fee (XLM)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-400 mb-1">∞</p>
              <p className="text-gray-400">Scalability</p>
            </div>
          </div>
        </motion.div>

        {/* Installation Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-white mb-3">1. Install Freighter</h3>
              <p className="text-gray-400 text-sm mb-3">
                Add the Freighter wallet extension to your browser from the Chrome Web Store.
              </p>
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-stellar-400 hover:text-stellar-300 transition-colors"
              >
                <span>Download Freighter</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            
            <div>
              <h3 className="font-medium text-white mb-3">2. Connect & Start</h3>
              <p className="text-gray-400 text-sm">
                Create or import your wallet, then click "Connect Freighter Wallet" to get started with instant payments and rewards.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WalletConnectModal;
