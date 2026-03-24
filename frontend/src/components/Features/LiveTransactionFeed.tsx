import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAppStore } from '../../store/appStore';
import { formatStellarAmount } from '../../lib/utils';

const LiveTransactionFeed: React.FC = () => {
  const { liveTransactions } = useAppStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [liveTransactions]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-dark-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-stellar-400" />
          <h3 className="text-lg font-semibold text-white">Live Activity</h3>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        <AnimatePresence>
          {liveTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Zap className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No live transactions yet</p>
              <p className="text-xs text-gray-500 mt-1">Activity will appear here</p>
            </motion.div>
          ) : (
            liveTransactions.map((tx, index) => (
              <motion.div
                key={`${tx.transaction_id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-dark-700/50 rounded-lg p-3 border border-white/5 hover:border-stellar-500/20 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {tx.sender === tx.receiver ? (
                      <div className="p-1 bg-blue-500/20 rounded">
                        <Activity className="w-3 h-3 text-blue-400" />
                      </div>
                    ) : (
                      <div className="p-1 bg-green-500/20 rounded">
                        <ArrowUpRight className="w-3 h-3 text-green-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tx.sender === tx.receiver ? 'Contract Call' : 'Payment'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Amount</span>
                    <span className="text-sm font-mono text-stellar-400">
                      {formatStellarAmount(tx.amount)} XLM
                    </span>
                  </div>

                  {tx.fee_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Fee</span>
                      <span className="text-xs font-mono text-gray-300">
                        {formatStellarAmount(tx.fee_amount)} XLM
                      </span>
                    </div>
                  )}

                  {tx.cashback_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Cashback</span>
                      <span className="text-xs font-mono text-green-400">
                        +{formatStellarAmount(tx.cashback_amount)} XLM
                      </span>
                    </div>
                  )}

                  {tx.split_payments.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-xs text-gray-400 mb-1">Split Payment</p>
                      <div className="space-y-1">
                        {tx.split_payments.slice(0, 2).map((split, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-mono">
                              {split.receiver.slice(0, 6)}...{split.receiver.slice(-4)}
                            </span>
                            <span className="text-gray-300">
                              {formatStellarAmount(split.amount)} XLM
                            </span>
                          </div>
                        ))}
                        {tx.split_payments.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{tx.split_payments.length - 2} more...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction link */}
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${tx.transaction_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center space-x-1 text-xs text-stellar-400 hover:text-stellar-300 transition-colors"
                >
                  <span>View on Explorer</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {liveTransactions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center">
            Showing {liveTransactions.length} recent transactions
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default LiveTransactionFeed;
