import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Activity, DollarSign, Zap, Shield } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { formatStellarAmount } from '../../lib/utils';

const OverviewTab: React.FC = () => {
  const { contractStats, walletAddress, balance, transactions } = useAppStore();

  const stats = [
    {
      title: 'Total Volume',
      value: formatStellarAmount(contractStats.volume),
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      change: '+12.5%',
    },
    {
      title: 'Total Payments',
      value: contractStats.payments.toString(),
      icon: Activity,
      color: 'from-blue-500 to-cyan-600',
      change: '+8.2%',
    },
    {
      title: 'Active Users',
      value: contractStats.activeUsers.toString(),
      icon: Users,
      color: 'from-purple-500 to-pink-600',
      change: '+15.3%',
    },
    {
      title: 'Total Rewards',
      value: formatStellarAmount(contractStats.totalRewards),
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      change: '+23.1%',
    },
  ];

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">
          Welcome back! Here's what's happening with your Stellar payments.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-stellar-500/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-green-400">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-400">{stat.title}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Wallet Info */}
        <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Wallet Info</h2>
            <Shield className="w-5 h-5 text-stellar-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Connected Address</p>
              <p className="font-mono text-sm text-white">
                {walletAddress?.slice(0, 12)}...{walletAddress?.slice(-12)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">XLM Balance</p>
              <p className="text-2xl font-bold text-stellar-400">
                {formatStellarAmount(balance)} XLM
              </p>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <button className="w-full bg-stellar-500 hover:bg-stellar-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Manage Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <TrendingUp className="w-5 h-5 text-stellar-400" />
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recent transactions</p>
              <p className="text-xs text-gray-500 mt-1">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {formatStellarAmount(tx.amount)} XLM
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.sender.slice(0, 6)}...{tx.sender.slice(-4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-green-400">Success</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Features Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-stellar-500/10 to-purple-500/10 backdrop-blur-xl rounded-xl border border-stellar-500/20 p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-4">Advanced Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-stellar-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Zap className="w-6 h-6 text-stellar-400" />
            </div>
            <h3 className="font-medium text-white mb-1">Micro-Cashbacks</h3>
            <p className="text-sm text-gray-400">Earn instant rewards on every payment</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-medium text-white mb-1">Split Payments</h3>
            <p className="text-sm text-gray-400">Send payments to multiple recipients</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-medium text-white mb-1">Smart Fees</h3>
            <p className="text-sm text-gray-400">Optimized fee structure with discounts</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OverviewTab;
