import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Send, Users, TrendingUp, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import * as Stellar from '@stellar/stellar-sdk';

const CONTRACT_ADDRESSES = {
  payment: 'PAYMENT_CONTRACT_ID_HERE',
  fee: 'FEE_CONTRACT_ID_HERE',
  reward: 'REWARD_CONTRACT_ID_HERE',
  token: 'TOKEN_CONTRACT_ID_HERE',
  split: 'SPLIT_CONTRACT_ID_HERE',
};

const TESTNET_EXPLORER = 'https://stellar.expert/explorer/testnet';

const App: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [splits, setSplits] = useState([
    { address: '', percentage: 50 },
    { address: '', percentage: 50 },
  ]);
  const [paymentType, setPaymentType] = useState<'single' | 'split'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contractStats, setContractStats] = useState({
    paymentVolume: 0,
    totalPayments: 0,
    totalFees: 0,
    totalRewards: 0,
  });

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.freighterr) {
        alert('Please install Freighter wallet extension');
        return;
      }

      const { publicKey } = await window.freighterr.request({
        method: 'connect',
      });

      if (publicKey) {
        setWalletAddress(publicKey);
        setIsConnected(true);
        await loadBalance(publicKey);
        await loadContractStats();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet');
    }
  };

  // Load wallet balance
  const loadBalance = async (address: string) => {
    try {
      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(address);
      const xlmBalance = account.balances.find(
        (balance: any) => balance.asset_type === 'native'
      );
      setBalance(parseFloat(xlmBalance?.balance || '0'));
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  // Load contract statistics
  const loadContractStats = async () => {
    try {
      // Mock data for demonstration
      setContractStats({
        paymentVolume: 50000000, // 5 XLM in stroops
        totalPayments: 25,
        totalFees: 150000, // 0.015 XLM
        totalRewards: 500000, // 0.05 XLM
      });
    } catch (error) {
      console.error('Error loading contract stats:', error);
    }
  };

  // Send single payment
  const sendSinglePayment = async () => {
    setIsLoading(true);
    try {
      if (!window.freighterr) {
        throw new Error('Wallet not connected');
      }

      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(walletAddress);
      
      const amountInStroops = Math.floor(parseFloat(amount) * 10000000);
      
      const transaction = new Stellar.TransactionBuilder(account, {
        fee: Stellar.BASE_FEE,
        networkPassphrase: Stellar.Networks.TESTNET,
      })
        .addOperation(
          Stellar.Operation.payment({
            destination: recipient,
            asset: Stellar.Asset.native(),
            amount: amountInStroops.toString(),
          })
        )
        .setTimeout(30)
        .build();

      // Sign transaction
      const signedXDR = await window.freighterr.request({
        method: 'signTransaction',
        params: { xdr: transaction.toXDR() },
      });

      // Submit transaction
      const result = await server.submitTransaction(signedXDR);
      
      // Add to transaction history
      const newTransaction = {
        hash: result.hash,
        type: 'single',
        amount: parseFloat(amount),
        recipient,
        timestamp: new Date().toISOString(),
        status: 'success',
        fee: 0.00001,
        cashback: parseFloat(amount) * 0.01,
      };
      
      setTransactions([newTransaction, ...transactions]);
      setBalance(balance - parseFloat(amount) - 0.00001);
      setRecipient('');
      setAmount('');
      
      alert(`Payment sent successfully! Transaction: ${result.hash}`);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Send split payment
  const sendSplitPayment = async () => {
    setIsLoading(true);
    try {
      if (!window.freighterr) {
        throw new Error('Wallet not connected');
      }

      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(walletAddress);
      
      const amountInStroops = Math.floor(parseFloat(amount) * 10000000);
      
      // Create transaction with multiple operations
      let transactionBuilder = new Stellar.TransactionBuilder(account, {
        fee: (Stellar.BASE_FEE * splits.length).toString(),
        networkPassphrase: Stellar.Networks.TESTNET,
      });

      // Add split operations
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

      const transaction = transactionBuilder.setTimeout(30).build();

      // Sign transaction
      const signedXDR = await window.freighterr.request({
        method: 'signTransaction',
        params: { xdr: transaction.toXDR() },
      });

      // Submit transaction
      const result = await server.submitTransaction(signedXDR);
      
      // Add to transaction history
      const newTransaction = {
        hash: result.hash,
        type: 'split',
        amount: parseFloat(amount),
        recipients: splits.map(s => ({ address: s.address, percentage: s.percentage })),
        timestamp: new Date().toISOString(),
        status: 'success',
        fee: 0.00001 * splits.length,
        cashback: parseFloat(amount) * 0.01,
      };
      
      setTransactions([newTransaction, ...transactions]);
      setBalance(balance - parseFloat(amount) - (0.00001 * splits.length));
      setRecipient('');
      setAmount('');
      
      alert(`Split payment sent successfully! Transaction: ${result.hash}`);
    } catch (error) {
      console.error('Split payment error:', error);
      alert('Split payment failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add split recipient
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

  // Remove split recipient
  const removeSplit = (index: number) => {
    if (splits.length > 2) {
      const newSplits = splits.filter((_, i) => i !== index);
      const newPercentage = Math.floor(100 / newSplits.length);
      setSplits(newSplits.map((s, i) => ({ ...s, percentage: newPercentage })));
    }
  };

  // Update split
  const updateSplit = (index: number, field: 'address' | 'percentage', value: string | number) => {
    const newSplits = [...splits];
    if (field === 'address') {
      newSplits[index].address = value as string;
    } else {
      newSplits[index].percentage = value as number;
    }
    setSplits(newSplits);
  };

  useEffect(() => {
    // Auto-connect if previously connected
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setIsConnected(true);
      loadBalance(savedAddress);
      loadContractStats();
    }
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Stellar Payment DApp</h1>
            <p className="text-white/80 mb-8">Inter-Contract Architecture Demo</p>
            <button
              onClick={connectWallet}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Wallet className="w-5 h-5" />
              <span>Connect Freighter Wallet</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Stellar Payment DApp</h1>
              <p className="text-white/80">Inter-Contract Architecture • Level 4</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm">Connected Wallet</p>
              <p className="text-white font-mono text-sm">{walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}</p>
              <p className="text-xl font-bold text-green-400">{balance.toFixed(6)} XLM</p>
            </div>
          </div>
        </motion.div>

        {/* Contract Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-xs text-white/60">Volume</span>
            </div>
            <p className="text-xl font-bold text-white">{(contractStats.paymentVolume / 10000000).toFixed(2)} XLM</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <Send className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-white/60">Payments</span>
            </div>
            <p className="text-xl font-bold text-white">{contractStats.totalPayments}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <span className="text-xs text-white/60">Fees</span>
            </div>
            <p className="text-xl font-bold text-white">{(contractStats.totalFees / 10000000).toFixed(6)} XLM</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-white/60">Rewards</span>
            </div>
            <p className="text-xl font-bold text-white">{(contractStats.totalRewards / 10000000).toFixed(6)} XLM</p>
          </div>
        </motion.div>

        {/* Payment Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Send Payment</h2>
          
          {/* Payment Type Selector */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setPaymentType('single')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                paymentType === 'single'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Send className="w-5 h-5 inline mr-2" />
              Single Payment
            </button>
            <button
              onClick={() => setPaymentType('split')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                paymentType === 'split'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Split Payment
            </button>
          </div>

          {paymentType === 'single' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="G..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Amount (XLM)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                />
              </div>
              <button
                onClick={sendSinglePayment}
                disabled={!recipient || !amount || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                {isLoading ? 'Processing...' : 'Send Payment'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Total Amount (XLM)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/80 text-sm font-medium">Recipients</label>
                  <button
                    onClick={addSplit}
                    disabled={splits.length >= 5}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg"
                  >
                    Add Recipient
                  </button>
                </div>
                
                {splits.map((split, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={split.address}
                      onChange={(e) => updateSplit(index, 'address', e.target.value)}
                      placeholder="G..."
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    />
                    <input
                      type="number"
                      value={split.percentage}
                      onChange={(e) => updateSplit(index, 'percentage', parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-white/60">%</span>
                    {splits.length > 2 && (
                      <button
                        onClick={() => removeSplit(index)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={sendSplitPayment}
                disabled={!amount || splits.some(s => !s.address) || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              >
                {isLoading ? 'Processing...' : 'Send Split Payment'}
              </button>
            </div>
          )}
        </motion.div>

        {/* Contract Architecture Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Inter-Contract Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Payment Flow</h3>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Payment Contract receives request</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Fee Contract calculates fees</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Reward Contract calculates cashback</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span>Split Contract processes distribution</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Contract Addresses</h3>
              <div className="space-y-1 text-xs text-white/60 font-mono">
                <div>Payment: {CONTRACT_ADDRESSES.payment.slice(0, 12)}...</div>
                <div>Fee: {CONTRACT_ADDRESSES.fee.slice(0, 12)}...</div>
                <div>Reward: {CONTRACT_ADDRESSES.reward.slice(0, 12)}...</div>
                <div>Token: {CONTRACT_ADDRESSES.token.slice(0, 12)}...</div>
                <div>Split: {CONTRACT_ADDRESSES.split.slice(0, 12)}...</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Send className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {tx.type}
                        </span>
                        <span className="text-white font-semibold">
                          {tx.amount} XLM
                        </span>
                      </div>
                      <div className="text-white/60 text-sm mt-1">
                        {tx.type === 'split' ? 
                          `${tx.recipients.length} recipients` : 
                          `To: ${tx.recipient.slice(0, 12)}...`
                        }
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        Fee: {tx.fee} XLM • Cashback: {tx.cashback} XLM
                      </div>
                    </div>
                    <div className="text-right">
                      <a
                        href={`${TESTNET_EXPLORER}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    freighterr?: {
      request: (params: { method: string; params?: any }) => Promise<any>;
    };
  }
}

export default App;
