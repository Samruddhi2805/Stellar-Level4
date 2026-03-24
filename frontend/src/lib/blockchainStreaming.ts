import { Server, Api } from '@stellar/stellar-sdk';
import io, { Socket } from 'socket.io-client';
import { useAppStore } from '../store/appStore';

interface StellarEvent {
  id: string;
  type: 'payment' | 'fee_payment' | 'reward' | 'cashback' | 'referral' | 'subscription';
  timestamp: number;
  data: any;
  transaction_hash: string;
  contract_id?: string;
}

interface StreamingConfig {
  horizonUrl: string;
  rpcUrl: string;
  socketUrl?: string;
  retryInterval: number;
  maxRetries: number;
}

class BlockchainStreamingService {
  private server: Server;
  private socket: Socket | null = null;
  private config: StreamingConfig;
  private eventHandlers: Map<string, ((event: StellarEvent) => void)[]> = new Map();
  private retryCount = 0;
  private isStreaming = false;
  private cursor: string = 'now';

  constructor(config: StreamingConfig) {
    this.config = config;
    this.server = new Server(config.horizonUrl);
  }

  // Initialize WebSocket connection for real-time updates
  public initializeWebSocket() {
    if (!this.config.socketUrl) {
      console.warn('Socket URL not configured, falling back to polling');
      this.startPolling();
      return;
    }

    this.socket = io(this.config.socketUrl, {
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: false,
    });

    this.socket.on('connect', () => {
      console.log('Connected to streaming server');
      this.retryCount = 0;
      this.isStreaming = true;
    });

    this.socket.on('stellar_event', (event: StellarEvent) => {
      this.handleEvent(event);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from streaming server');
      this.isStreaming = false;
      this.handleReconnection();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleReconnection();
    });
  }

  // Start polling Stellar Horizon API for transactions
  private async startPolling() {
    if (this.isStreaming) return;

    this.isStreaming = true;
    console.log('Starting Stellar Horizon polling...');

    const poll = async () => {
      if (!this.isStreaming) return;

      try {
        const transactions = await this.server.transactions()
          .cursor(this.cursor)
          .limit(10)
          .order('desc')
          .call();

        for (const record of transactions.records) {
          if (record.successful && record.transaction) {
            await this.processTransaction(record);
          }
        }

        this.cursor = transactions.records[records.records.length - 1]?.paging_token || this.cursor;
      } catch (error) {
        console.error('Polling error:', error);
        this.handleReconnection();
      }

      setTimeout(poll, this.config.retryInterval);
    };

    poll();
  }

  // Process individual transaction for relevant events
  private async processTransaction(transaction: Api.TransactionRecord) {
    try {
      const tx = await this.server.transactions()
        .transaction(transaction.hash)
        .call();

      // Check for contract interactions
      if (tx.operations) {
        for (const op of tx.operations) {
          if (op.type === 'invoke_host_function') {
            await this.processContractOperation(tx, op);
          } else if (op.type === 'payment') {
            await this.processPaymentOperation(tx, op);
          }
        }
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  }

  // Process contract invocations
  private async processContractOperation(transaction: any, operation: any) {
    const { addLiveTransaction, addNotification } = useAppStore.getState();

    try {
      // Parse contract events from transaction meta
      const events = this.extractEventsFromTransaction(transaction);
      
      for (const event of events) {
        const stellarEvent: StellarEvent = {
          id: `${transaction.hash}_${event.type}`,
          type: event.type,
          timestamp: new Date(transaction.created_at).getTime(),
          data: event.data,
          transaction_hash: transaction.hash,
          contract_id: event.contract_id,
        };

        this.handleEvent(stellarEvent);
      }

      // Add to live transactions
      if (events.length > 0) {
        addLiveTransaction({
          sender: transaction.source_account,
          receiver: operation.destination || 'Contract',
          amount: operation.amount || 0,
          fee_amount: 0,
          cashback_amount: 0,
          timestamp: new Date(transaction.created_at).getTime(),
          transaction_id: transaction.hash,
          split_payments: [],
        });
      }
    } catch (error) {
      console.error('Error processing contract operation:', error);
    }
  }

  // Process simple payment operations
  private async processPaymentOperation(transaction: any, operation: any) {
    const { addLiveTransaction, addNotification } = useAppStore.getState();

    const stellarEvent: StellarEvent = {
      id: `${transaction.hash}_payment`,
      type: 'payment',
      timestamp: new Date(transaction.created_at).getTime(),
      data: {
        from: operation.from,
        to: operation.to,
        amount: operation.amount,
        asset_type: operation.asset_type,
      },
      transaction_hash: transaction.hash,
    };

    this.handleEvent(stellarEvent);

    addLiveTransaction({
      sender: operation.from,
      receiver: operation.to,
      amount: parseFloat(operation.amount),
      fee_amount: 0,
      cashback_amount: 0,
      timestamp: new Date(transaction.created_at).getTime(),
      transaction_id: transaction.hash,
      split_payments: [],
    });

    addNotification({
      type: 'info',
      title: 'New Payment',
      message: `${operation.amount} sent from ${operation.from.substring(0, 8)}... to ${operation.to.substring(0, 8)}...`,
    });
  }

  // Extract events from transaction metadata
  private extractEventsFromTransaction(transaction: any): any[] {
    const events: any[] = [];
    
    try {
      if (transaction.meta && transaction.meta.operations) {
        for (const op of transaction.meta.operations) {
          if (op.events && Array.isArray(op.events)) {
            for (const event of op.events) {
              if (event.type === 'contract') {
                events.push({
                  type: this.mapEventType(event.topic),
                  data: event.data,
                  contract_id: event.contract_id,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting events:', error);
    }

    return events;
  }

  // Map Stellar event topics to our event types
  private mapEventType(topic: string): StellarEvent['type'] {
    if (topic.includes('payment')) return 'payment';
    if (topic.includes('fee')) return 'fee_payment';
    if (topic.includes('reward')) return 'reward';
    if (topic.includes('cashback')) return 'cashback';
    if (topic.includes('referral')) return 'referral';
    if (topic.includes('subscription')) return 'subscription';
    return 'payment';
  }

  // Handle incoming events
  private handleEvent(event: StellarEvent) {
    const { addNotification, updateContractStats, addReward } = useAppStore.getState();

    // Trigger registered event handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });

    // Update global state based on event type
    switch (event.type) {
      case 'payment':
        updateContractStats({
          volume: useAppStore.getState().contractStats.volume + (event.data.amount || 0),
          payments: useAppStore.getState().contractStats.payments + 1,
        });
        break;

      case 'cashback':
        addReward({
          user: event.data.user || '',
          reward_type: 'cashback',
          amount: event.data.amount || 0,
          transaction_id: event.transaction_hash,
          timestamp: event.timestamp,
          claimed: false,
        });
        updateContractStats({
          totalRewards: useAppStore.getState().contractStats.totalRewards + (event.data.amount || 0),
        });
        break;

      case 'reward':
        addReward({
          user: event.data.user || '',
          reward_type: event.data.reward_type || 'bonus',
          amount: event.data.amount || 0,
          transaction_id: event.transaction_hash,
          timestamp: event.timestamp,
          claimed: false,
        });
        break;
    }

    // Add notification for significant events
    if (this.shouldNotify(event)) {
      addNotification({
        type: 'success',
        title: this.getEventTitle(event),
        message: this.getEventMessage(event),
      });
    }
  }

  // Determine if event should trigger notification
  private shouldNotify(event: StellarEvent): boolean {
    const { walletAddress } = useAppStore.getState();
    
    // Always notify for user's own transactions
    if (event.data.user === walletAddress || event.data.sender === walletAddress) {
      return true;
    }

    // Notify for high-value transactions
    if (event.data.amount && parseFloat(event.data.amount) > 100) {
      return true;
    }

    // Notify for special events
    return ['cashback', 'reward', 'subscription'].includes(event.type);
  }

  // Get notification title for event
  private getEventTitle(event: StellarEvent): string {
    switch (event.type) {
      case 'payment': return 'Payment Sent';
      case 'cashback': return 'Cashback Received';
      case 'reward': return 'Reward Earned';
      case 'referral': return 'Referral Bonus';
      case 'subscription': return 'Subscription Active';
      default: return 'Blockchain Event';
    }
  }

  // Get notification message for event
  private getEventMessage(event: StellarEvent): string {
    switch (event.type) {
      case 'payment':
        return `Payment of ${event.data.amount} processed successfully`;
      case 'cashback':
        return `You received ${event.data.amount} in cashback`;
      case 'reward':
        return `You earned ${event.data.amount} ${event.data.reward_type} reward`;
      case 'referral':
        return `Referral bonus of ${event.data.amount} credited`;
      case 'subscription':
        return `Subscription ${event.data.tier} activated`;
      default:
        return 'Transaction confirmed';
    }
  }

  // Register event handlers
  public onEvent(eventType: StellarEvent['type'], handler: (event: StellarEvent) => void) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Remove event handler
  public offEvent(eventType: StellarEvent['type'], handler: (event: StellarEvent) => void) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Handle reconnection logic
  private handleReconnection() {
    if (this.retryCount >= this.config.maxRetries) {
      console.error('Max retry attempts reached');
      this.isStreaming = false;
      return;
    }

    this.retryCount++;
    console.log(`Attempting reconnection ${this.retryCount}/${this.config.maxRetries}`);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      } else {
        this.startPolling();
      }
    }, this.config.retryInterval * this.retryCount);
  }

  // Start streaming
  public start() {
    if (this.isStreaming) return;
    
    this.initializeWebSocket();
  }

  // Stop streaming
  public stop() {
    this.isStreaming = false;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Get streaming status
  public isActive(): boolean {
    return this.isStreaming;
  }
}

// Singleton instance
let streamingService: BlockchainStreamingService | null = null;

export const getStreamingService = (config?: StreamingConfig): BlockchainStreamingService => {
  if (!streamingService) {
    const defaultConfig: StreamingConfig = {
      horizonUrl: 'https://horizon-testnet.stellar.org',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      socketUrl: process.env.VITE_SOCKET_URL || 'ws://localhost:3001',
      retryInterval: 5000,
      maxRetries: 10,
    };

    streamingService = new BlockchainStreamingService(config || defaultConfig);
  }
  
  return streamingService;
};

export type { StellarEvent, StreamingConfig };
