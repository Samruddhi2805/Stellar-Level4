import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, Repeat, Plus, Minus, Calculator } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { validateStellarAddress, validateAmount, formatStellarAmount } from '../../lib/utils';

const SendTab: React.FC = () => {
  const { balance, addTransaction, setPendingTransaction, addNotification } = useAppStore();
  const [paymentType, setPaymentType] = useState<'single' | 'split' | 'recurring'>('single');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [splits, setSplits] = useState([{ address: '', percentage: 50 }, { address: '', percentage: 50 }]);
  const [recurring, setRecurring] = useState({
    interval: 'monthly',
    count: 12,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const quickAmounts = [1, 5, 10, 25, 50, 100];

  const handleSend = async () => {
    setErrors({});
    
    if (paymentType === 'single') {
      const addressValidation = validateStellarAddress(recipient);
      const amountValidation = validateAmount(amount);
      
      if (!addressValidation) {
        setErrors({ recipient: 'Invalid Stellar address' });
        return;
      }
      
      if (!amountValidation.isValid) {
        setErrors({ amount: amountValidation.error });
        return;
      }
      
      const amountNum = parseFloat(amount);
      if (amountNum > balance) {
        setErrors({ amount: 'Insufficient balance' });
        return;
      }
    }

    setPendingTransaction(true);
    
    try {
      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const transaction = {
        sender: 'current_user_address',
        receiver: recipient || '',
        amount: parseFloat(amount) * 10000000, // Convert to stroops
        fee_amount: 100,
        cashback_amount: Math.floor(parseFloat(amount) * 10000000 * 0.01), // 1% cashback
        timestamp: Date.now(),
        transaction_id: `tx_${Date.now()}`,
        split_payments: paymentType === 'split' ? splits.map(s => ({
          receiver: s.address,
          amount: (parseFloat(amount) * s.percentage / 100) * 10000000,
          percentage: s.percentage * 100, // Convert to basis points
        })) : [],
      };
      
      addTransaction(transaction);
      addNotification({
        type: 'success',
        title: 'Payment Sent',
        message: `${amount} XLM sent successfully`,
      });
      
      // Reset form
      setRecipient('');
      setAmount('');
      setSplits([{ address: '', percentage: 50 }, { address: '', percentage: 50 }]);
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: 'Please try again later',
      });
    } finally {
      setPendingTransaction(false);
    }
  };

  const addSplit = () => {
    if (splits.length < 5) {
      const newPercentage = Math.floor(100 / (splits.length + 1));
      const updatedSplits = splits.map((s, i) => ({
        ...s,
        percentage: i === splits.length - 1 ? s.percentage - (newPercentage - (100 % (splits.length + 1))) : newPercentage
      }));
      setSplits([...updatedSplits, { address: '', percentage: newPercentage }]);
    }
  };

  const removeSplit = (index: number) => {
    if (splits.length > 2) {
      const newSplits = splits.filter((_, i) => i !== index);
      const newPercentage = Math.floor(100 / newSplits.length);
      setSplits(newSplits.map((s, i) => ({ ...s, percentage: newPercentage })));
    }
  };

  const updateSplit = (index: number, field: 'address' | 'percentage', value: string | number) => {
    const newSplits = [...splits];
    if (field === 'address') {
      newSplits[index].address = value as string;
    } else {
      newSplits[index].percentage = value as number;
    }
    setSplits(newSplits);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Send Payments</h1>
        <p className="text-gray-400">Send XLM with smart fees, cashbacks, and advanced features.</p>
      </div>

      {/* Payment Type Selector */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Payment Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setPaymentType('single')}
            className={`p-4 rounded-lg border transition-all ${
              paymentType === 'single'
                ? 'border-stellar-500 bg-stellar-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Send className="w-6 h-6 mx-auto mb-2 text-stellar-400" />
            <h3 className="font-medium text-white">Single Payment</h3>
            <p className="text-sm text-gray-400 mt-1">Send to one recipient</p>
          </button>
          
          <button
            onClick={() => setPaymentType('split')}
            className={`p-4 rounded-lg border transition-all ${
              paymentType === 'split'
                ? 'border-stellar-500 bg-stellar-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Users className="w-6 h-6 mx-auto mb-2 text-stellar-400" />
            <h3 className="font-medium text-white">Split Payment</h3>
            <p className="text-sm text-gray-400 mt-1">Send to multiple recipients</p>
          </button>
          
          <button
            onClick={() => setPaymentType('recurring')}
            className={`p-4 rounded-lg border transition-all ${
              paymentType === 'recurring'
                ? 'border-stellar-500 bg-stellar-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Repeat className="w-6 h-6 mx-auto mb-2 text-stellar-400" />
            <h3 className="font-medium text-white">Recurring</h3>
            <p className="text-sm text-gray-400 mt-1">Schedule regular payments</p>
          </button>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        {paymentType === 'single' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="G..."
                className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500 ${
                  errors.recipient ? 'border-red-500' : 'border-white/10'
                }`}
              />
              {errors.recipient && (
                <p className="mt-1 text-sm text-red-400">{errors.recipient}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (XLM)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 pr-16 bg-dark-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500 ${
                    errors.amount ? 'border-red-500' : 'border-white/10'
                  }`}
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  XLM
                </span>
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
              )}
              
              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className="px-3 py-1 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    {quickAmount} XLM
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {paymentType === 'split' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-300">
                  Split Recipients
                </label>
                <button
                  onClick={addSplit}
                  disabled={splits.length >= 5}
                  className="flex items-center space-x-1 px-3 py-1 bg-stellar-500 hover:bg-stellar-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Split</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={split.address}
                      onChange={(e) => updateSplit(index, 'address', e.target.value)}
                      placeholder="G..."
                      className="flex-1 px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500"
                    />
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={split.percentage}
                        onChange={(e) => updateSplit(index, 'percentage', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-2 bg-dark-700 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-stellar-500"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                    {splits.length > 2 && (
                      <button
                        onClick={() => removeSplit(index)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total Amount (XLM)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500"
              />
            </div>
          </div>
        )}

        {paymentType === 'recurring' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="G..."
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (XLM)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interval
                </label>
                <select
                  value={recurring.interval}
                  onChange={(e) => setRecurring({ ...recurring, interval: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-stellar-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Payments
                </label>
                <input
                  type="number"
                  value={recurring.count}
                  onChange={(e) => setRecurring({ ...recurring, count: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="365"
                  className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-stellar-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Fee and Cashback Info */}
        {amount && (
          <div className="bg-dark-700/50 rounded-lg p-4 border border-white/5">
            <h3 className="font-medium text-white mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2 text-stellar-400" />
              Transaction Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white">{formatStellarAmount(parseFloat(amount) * 10000000)} XLM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated Fee:</span>
                <span className="text-white">0.00001 XLM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cashback (1%):</span>
                <span className="text-green-400">+{formatStellarAmount(parseFloat(amount) * 10000000 * 0.01)} XLM</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-medium">
                <span className="text-white">Total:</span>
                <span className="text-stellar-400">
                  {formatStellarAmount((parseFloat(amount) + 0.00001) * 10000000)} XLM
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!amount || (paymentType === 'single' && !recipient)}
          className="w-full bg-gradient-to-r from-stellar-500 to-stellar-600 hover:from-stellar-600 hover:to-stellar-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Send className="w-5 h-5" />
          <span>Send Payment</span>
        </button>
      </div>
    </motion.div>
  );
};

export default SendTab;
