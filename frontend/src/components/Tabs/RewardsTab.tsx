import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, TrendingUp, Users, Calendar, Award, Zap, Crown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { formatStellarAmount, formatDistanceToNow } from '../../lib/utils';

const RewardsTab: React.FC = () => {
  const { userRewards, activityStreak, tokenBalance, contractStats } = useAppStore();
  const [activeRewardTab, setActiveRewardTab] = useState<'overview' | 'history' | 'referrals'>('overview');

  const rewardStats = [
    {
      title: 'Total Earned',
      value: formatStellarAmount(contractStats.totalRewards),
      icon: Gift,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Current Streak',
      value: activityStreak?.current_streak.toString() || '0',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600',
    },
    {
      title: 'Token Balance',
      value: formatStellarAmount(tokenBalance),
      icon: Crown,
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Referral Count',
      value: '0',
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
    },
  ];

  const rewardTypes = [
    {
      type: 'cashback',
      name: 'Cashback Rewards',
      description: 'Earn 1% back on every payment',
      icon: Zap,
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      rate: '1%',
    },
    {
      type: 'daily_activity',
      name: 'Daily Activity',
      description: 'Bonus for daily app usage',
      icon: Calendar,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      rate: '0.001 XLM',
    },
    {
      type: 'streak_bonus',
      name: 'Streak Bonuses',
      description: 'Extra rewards for consistent activity',
      icon: Award,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      rate: '0.005 XLM',
    },
    {
      type: 'referral',
      name: 'Referral Rewards',
      description: 'Earn by inviting friends',
      icon: Users,
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      rate: '0.01 XLM',
    },
  ];

  const recentRewards = userRewards.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Rewards & Incentives</h1>
        <p className="text-gray-400">
          Earn rewards through cashbacks, referrals, and activity bonuses.
        </p>
      </div>

      {/* Reward Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rewardStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6"
            >
              <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-lg w-12 h-12 flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-400">{stat.title}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Reward Tabs */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10">
        <div className="border-b border-white/10">
          <div className="flex space-x-1 p-1">
            {(['overview', 'history', 'referrals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveRewardTab(tab)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeRewardTab === tab
                    ? 'bg-stellar-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeRewardTab === 'overview' && (
            <div className="space-y-6">
              {/* Activity Streak */}
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-6 border border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Activity Streak</h3>
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-400">
                      {activityStreak?.current_streak || 0}
                    </p>
                    <p className="text-sm text-gray-400">Current Streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">
                      {activityStreak?.longest_streak || 0}
                    </p>
                    <p className="text-sm text-gray-400">Longest Streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-stellar-400">
                      {activityStreak?.total_activities || 0}
                    </p>
                    <p className="text-sm text-gray-400">Total Activities</p>
                  </div>
                </div>
                {activityStreak && activityStreak.current_streak > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-400">
                      Last activity: {formatDistanceToNow(new Date(activityStreak.last_activity))}
                    </p>
                  </div>
                )}
              </div>

              {/* Reward Types */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Reward Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewardTypes.map((reward) => {
                    const Icon = reward.icon;
                    return (
                      <div
                        key={reward.type}
                        className={`p-4 rounded-lg border ${reward.color}`}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="w-5 h-5 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-1">{reward.name}</h4>
                            <p className="text-sm text-gray-400 mb-2">{reward.description}</p>
                            <span className="text-xs font-medium">{reward.rate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeRewardTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Reward History</h3>
              
              {recentRewards.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No rewards yet</p>
                  <p className="text-sm text-gray-500 mt-1">Start making payments to earn rewards</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRewards.map((reward, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg border border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Gift className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white capitalize">{reward.reward_type.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-400">
                            {formatDistanceToNow(new Date(reward.timestamp))}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-400">
                          +{formatStellarAmount(reward.amount)} XLM
                        </p>
                        <p className="text-xs text-gray-500">
                          {reward.claimed ? 'Claimed' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeRewardTab === 'referrals' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-white mb-2">Referral Program</h3>
                <p className="text-gray-400 mb-4">
                  Invite friends and earn rewards when they make their first payment
                </p>
                <div className="bg-dark-700/50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-400 mb-2">Your referral code:</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value="STELLAR2024"
                      readOnly
                      className="flex-1 px-3 py-2 bg-dark-600 border border-white/10 rounded-lg text-white font-mono text-center"
                    />
                    <button className="px-4 py-2 bg-stellar-500 hover:bg-stellar-600 text-white rounded-lg transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-stellar-400">0.01 XLM</p>
                    <p className="text-sm text-gray-400">You earn</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">0.005 XLM</p>
                    <p className="text-sm text-gray-400">Friend earns</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-sm text-gray-400">Total referred</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RewardsTab;
