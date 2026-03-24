import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Search, Filter, ExternalLink, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { formatStellarAmount, formatTimestamp, formatAddress } from '../../lib/utils';

const HistoryTab: React.FC = () => {
  const { transactions } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received' | 'split'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'pending' | 'failed'>('all');

  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      tx.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.receiver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    const matchesType = filterType === 'all' || 
      (filterType === 'sent' && tx.sender !== tx.receiver) ||
      (filterType === 'split' && tx.split_payments.length > 0) ||
      (filterType === 'received' && tx.sender === tx.receiver);

    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (tx: any) => {
    if (tx.split_payments.length > 0) {
      return <Activity className="w-4 h-4 text-blue-400" />;
    }
    if (tx.sender === tx.receiver) {
      return <Activity className="w-4 h-4 text-purple-400" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-green-400" />;
  };

  const getTransactionType = (tx: any) => {
    if (tx.split_payments.length > 0) return 'Split Payment';
    if (tx.sender === tx.receiver) return 'Contract Call';
    return 'Payment';
  };

  const exportHistory = () => {
    const csv = [
      ['Date', 'Type', 'From', 'To', 'Amount', 'Fee', 'Cashback', 'Transaction ID'],
      ...filteredTransactions.map(tx => [
        formatTimestamp(tx.timestamp),
        getTransactionType(tx),
        formatAddress(tx.sender),
        tx.split_payments.length > 0 ? `${tx.split_payments.length} recipients` : formatAddress(tx.receiver),
        formatStellarAmount(tx.amount),
        formatStellarAmount(tx.fee_amount),
        formatStellarAmount(tx.cashback_amount),
        tx.transaction_id
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stellar_transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
            <p className="text-gray-400">
              View and track all your Stellar transactions and rewards.
            </p>
          </div>
          <button
            onClick={exportHistory}
            disabled={filteredTransactions.length === 0}
            className="px-4 py-2 bg-stellar-500 hover:bg-stellar-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-dark-700 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-stellar-500"
          >
            <option value="all">All Types</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="split">Split Payments</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-dark-700 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-stellar-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Transactions ({filteredTransactions.length})
            </h2>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No transactions found</h3>
              <p className="text-gray-400">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Your transaction history will appear here once you start making payments'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx, index) => (
                <motion.div
                  key={tx.transaction_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-dark-700/50 rounded-lg p-4 border border-white/5 hover:border-stellar-500/20 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-white/5 rounded-lg mt-1">
                        {getTransactionIcon(tx)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            {getTransactionType(tx)}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                            Success
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span>{formatTimestamp(tx.timestamp)}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {formatAddress(tx.sender)} → {tx.split_payments.length > 0 ? 
                              `${tx.split_payments.length} recipients` : 
                              formatAddress(tx.receiver)
                            }
                          </span>
                        </div>

                        {tx.split_payments.length > 0 && (
                          <div className="mt-3 p-3 bg-dark-600/50 rounded-lg">
                            <p className="text-xs text-gray-400 mb-2">Split Details:</p>
                            <div className="space-y-1">
                              {tx.split_payments.slice(0, 3).map((split, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-gray-300 font-mono">
                                    {formatAddress(split.receiver)}
                                  </span>
                                  <span className="text-stellar-400">
                                    {formatStellarAmount(split.amount)} XLM
                                  </span>
                                </div>
                              ))}
                              {tx.split_payments.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{tx.split_payments.length - 3} more...
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="mb-2">
                        <p className="text-lg font-semibold text-white">
                          {formatStellarAmount(tx.amount)} XLM
                        </p>
                        {tx.cashback_amount > 0 && (
                          <p className="text-sm text-green-400">
                            +{formatStellarAmount(tx.cashback_amount)} cashback
                          </p>
                        )}
                      </div>
                      
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${tx.transaction_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-stellar-400 hover:text-stellar-300 transition-colors"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-stellar-400">
                {filteredTransactions.length}
              </p>
              <p className="text-sm text-gray-400">Total Transactions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {formatStellarAmount(
                  filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)
                )} XLM
              </p>
              <p className="text-sm text-gray-400">Total Volume</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {formatStellarAmount(
                  filteredTransactions.reduce((sum, tx) => sum + tx.cashback_amount, 0)
                )} XLM
              </p>
              <p className="text-sm text-gray-400">Total Cashbacks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">
                {formatStellarAmount(
                  filteredTransactions.reduce((sum, tx) => sum + tx.fee_amount, 0)
                )} XLM
              </p>
              <p className="text-sm text-gray-400">Total Fees</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default HistoryTab;
