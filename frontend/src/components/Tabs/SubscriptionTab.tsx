import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Star, Zap, Shield, Globe, HeadphonesIcon } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { formatStellarAmount, formatDuration } from '../../lib/utils';

const SubscriptionTab: React.FC = () => {
  const { balance, addNotification } = useAppStore();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const subscriptionTiers = [
    {
      id: 'basic',
      name: 'Basic',
      price: 10000000, // 0.1 XLM in stroops
      duration: 2592000, // 30 days
      icon: Star,
      color: 'from-gray-500 to-gray-600',
      features: [
        'Up to 10 transactions/month',
        '1% cashback on all payments',
        'Basic fee discounts',
        'Email support',
      ],
      popular: false,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 50000000, // 0.5 XLM in stroops
      duration: 2592000, // 30 days
      icon: Zap,
      color: 'from-stellar-500 to-stellar-600',
      features: [
        'Unlimited transactions',
        '2% cashback on all payments',
        '50% fee discounts',
        'Priority support',
        'Advanced analytics',
        'Split payments up to 10 recipients',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 200000000, // 2 XLM in stroops
      duration: 2592000, // 30 days
      icon: Crown,
      color: 'from-purple-500 to-pink-600',
      features: [
        'Everything in Premium',
        '3% cashback on all payments',
        'Zero transaction fees',
        '24/7 phone support',
        'Custom branding',
        'API access',
        'Unlimited split recipients',
        'Recurring payment automation',
      ],
      popular: false,
    },
  ];

  const handleSubscribe = async (tier: typeof subscriptionTiers[0]) => {
    if (balance < tier.price / 10000000) {
      addNotification({
        type: 'error',
        title: 'Insufficient Balance',
        message: `You need ${formatStellarAmount(tier.price)} XLM to subscribe to ${tier.name}`,
      });
      return;
    }

    try {
      // Simulate subscription process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification({
        type: 'success',
        title: 'Subscription Activated',
        message: `You are now subscribed to ${tier.name} tier!`,
      });
      
      setSelectedTier(null);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Subscription Failed',
        message: 'Please try again later',
      });
    }
  };

  const userBenefits = [
    {
      icon: Shield,
      title: 'Enhanced Security',
      description: 'Advanced security features and insurance for all transactions',
    },
    {
      icon: Globe,
      title: 'Global Access',
      description: 'Send payments worldwide with minimal fees and instant settlement',
    },
    {
      icon: HeadphonesIcon,
      title: 'Priority Support',
      description: 'Get help when you need it with our dedicated support team',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Subscription Plans</h1>
        <p className="text-gray-400">
          Unlock premium features and maximize your rewards with our subscription tiers.
        </p>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-gradient-to-r from-stellar-500/10 to-purple-500/10 backdrop-blur-xl rounded-xl border border-stellar-500/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Current Status</h2>
            <p className="text-gray-400">You are currently on the Free tier</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-stellar-400">0 XLM</p>
            <p className="text-sm text-gray-400">Monthly spending</p>
          </div>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionTiers.map((tier, index) => {
          const Icon = tier.icon;
          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-dark-800/50 backdrop-blur-xl rounded-xl border ${
                tier.popular 
                  ? 'border-stellar-500 ring-2 ring-stellar-500/20' 
                  : 'border-white/10'
              } p-6 hover:border-stellar-500/30 transition-all duration-200`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-3 py-1 bg-stellar-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`inline-flex p-3 bg-gradient-to-br ${tier.color} rounded-lg mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-white">
                    {formatStellarAmount(tier.price)}
                  </span>
                  <span className="text-gray-400"> /month</span>
                </div>
                <p className="text-sm text-gray-400">
                  {formatDuration(tier.duration)} duration
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={balance < tier.price / 10000000}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  tier.popular
                    ? 'bg-gradient-to-r from-stellar-500 to-stellar-600 hover:from-stellar-600 hover:to-stellar-700'
                    : 'bg-dark-600 hover:bg-dark-500'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {balance < tier.price / 10000000 
                  ? `Insufficient Balance (Need ${formatStellarAmount(tier.price)} XLM)`
                  : 'Subscribe Now'
                }
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Benefits Section */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Upgrade?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {userBenefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex p-3 bg-stellar-500/20 rounded-lg mb-4">
                  <Icon className="w-6 h-6 text-stellar-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-400">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-semibold text-white mb-2">How do subscriptions work?</h3>
            <p className="text-gray-400 text-sm">
              Subscriptions are billed monthly and automatically renew unless cancelled. You can upgrade or downgrade at any time.
            </p>
          </div>
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-semibold text-white mb-2">Can I cancel anytime?</h3>
            <p className="text-gray-400 text-sm">
              Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period.
            </p>
          </div>
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-semibold text-white mb-2">What payment methods are accepted?</h3>
            <p className="text-gray-400 text-sm">
              We accept XLM payments directly through your Stellar wallet. No credit cards or external payment processors needed.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Is there a free trial?</h3>
            <p className="text-gray-400 text-sm">
              All users start with our Basic features for free. You can upgrade to Premium or Enterprise at any time to unlock additional benefits.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionTab;
