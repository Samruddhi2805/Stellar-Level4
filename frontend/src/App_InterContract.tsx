import { useState, useEffect, useCallback, useRef } from "react";
import AuroraBackground from "./components/AuroraBackground";
import Navbar from "./components/Navbar";
import HeroCard from "./components/HeroCard";
import WalletCard from "./components/WalletCard";
import ContractStatsCard from "./components/ContractStatsCard";
import SendPaymentForm from "./components/SendPaymentForm";
import ErrorToast from "./components/ErrorToast";
import type { Toast } from "./components/ErrorToast";
import type { TxRecord } from "./components/SendPaymentForm";
import {
  getXLMBalance,
  readContractState,
  updateContractState,
  buildPaymentTx,
  submitClassicTx,
  submitTransaction,
  InsufficientBalanceError,
  type PaymentRecord,
  type ContractState,
} from "./lib/stellar";
import { connectWallet, signTransaction, disconnectWallet } from "./lib/walletKit";
import {
  cacheWalletAddress,
  getCachedWalletAddress,
  clearCachedWalletAddress,
  cacheBalance,
  getCachedBalance,
  cacheTransactions,
  getCachedTransactions,
  cacheContractState,
  getCachedContractState,
  clearAllCache,
} from "./lib/cache";

// ── Toast helpers ────────────────────────────────────────────────────────────
function makeToast(
  type: Toast["type"],
  title: string,
  message: string
): Toast {
  return { id: `${Date.now()}-${Math.random()}`, type, title, message };
}

function App() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [balanceFromCache, setBalanceFromCache] = useState(false);

  // ── Contract state ─────────────────────────────────────────────────────────
  const [contractState, setContractState] = useState<ContractState>({
    totalVolume: 0,
    totalPayments: 0,
  });
  const [contractLoading, setContractLoading] = useState(false);
  const [contractFromCache, setContractFromCache] = useState(false);

  // ── TX history ─────────────────────────────────────────────────────────────
  const [txHistory, setTxHistory] = useState<PaymentRecord[]>([]);

  // ── Transaction state ──────────────────────────────────────────────────────
  const [txRecord, setTxRecord] = useState<TxRecord>({ status: "idle" });

  // ── Loading flags ──────────────────────────────────────────────────────────
  const [connectLoading, setConnectLoading] = useState(false);

  // ── Toasts ─────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const balanceFromCacheRef = useRef(false);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = useCallback((t: Toast) => {
    setToasts((prev) => [t, ...prev].slice(0, 5));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Balance loader ─────────────────────────────────────────────────────────
  const loadBalance = useCallback(async (pubKey: string) => {
    try {
      const fresh = await getXLMBalance(pubKey);
      setBalance(fresh);
      setBalanceFromCache(false);
      balanceFromCacheRef.current = false;
      cacheBalance(fresh);
    } catch {
      // keep whatever is shown
    }
  }, []);

  // ── Contract state loader ──────────────────────────────────────────────────
  const loadContractState = useCallback(async () => {
    setContractLoading(true);
    try {
      const fresh = await readContractState();
      setContractState(fresh);
      setContractFromCache(false);
      cacheContractState(fresh);
    } catch {
      // keep cached
    } finally {
      setContractLoading(false);
    }
  }, []);

  // ── Real-time contract stats updates ────────────────────────────────────────
  useEffect(() => {
    // Temporarily disabled auto-refresh to fix errors
    // Update contract stats every 5 seconds for real-time feel
    /*
    const interval = setInterval(async () => {
      try {
        await loadContractState();
      } catch (error) {
        console.error('Contract stats update error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
    */
  }, [loadContractState]);

  // ── Auto-reconnect from cache ──────────────────────────────────────────────
  useEffect(() => {
    const cachedAddr = getCachedWalletAddress();
    const cachedBal = getCachedBalance();
    const cachedTxs = getCachedTransactions();
    const cachedContract = getCachedContractState();

    if (cachedAddr) {
      setAddress(cachedAddr);
      if (cachedBal !== null) {
        setBalance(cachedBal);
        setBalanceFromCache(true);
        balanceFromCacheRef.current = true;
      }
      if (cachedTxs.length > 0) setTxHistory(cachedTxs);
      if (cachedContract) {
        setContractState(cachedContract);
        setContractFromCache(true);
      }
      // Refresh from network
      loadBalance(cachedAddr);
      loadContractState();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect wallet ─────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setConnectLoading(true);
    try {
      const pubKey = await connectWallet();
      setAddress(pubKey);
      cacheWalletAddress(pubKey);
      await loadBalance(pubKey);
      await loadContractState();
      pushToast(
        makeToast("success", "Wallet Connected", `${pubKey.slice(0, 8)}…${pubKey.slice(-6)}`)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("WalletNotFound:")) {
        pushToast(
          makeToast(
            "error",
            "Wallet Not Found",
            "Freighter extension is not installed. Install it from the Chrome Web Store."
          )
        );
      } else if (msg.startsWith("TransactionRejected:")) {
        pushToast(
          makeToast("warning", "Connection Cancelled", "You closed the wallet modal.")
        );
      } else {
        pushToast(makeToast("error", "Connection Failed", msg));
      }
    } finally {
      setConnectLoading(false);
    }
  }, [loadBalance, loadContractState, pushToast]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    await disconnectWallet();
    setAddress("");
    setBalance(0);
    setTxHistory([]);
    setContractState({ totalVolume: 0, totalPayments: 0 });
    setTxRecord({ status: "idle" });
    clearAllCache();
    clearCachedWalletAddress();
  }, []);

  // ── Send payment ───────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (recipient: string, amount: number) => {
      setTxRecord({ status: "pending", step: "signing" });

      try {
        // Build TX
        const { xdr, isClassic } = await buildPaymentTx(address, recipient, amount);

        // Sign
        setTxRecord({ status: "pending", step: "signing" });
        const signedXDR = await signTransaction(xdr, address);

        // Submit
        setTxRecord({ status: "pending", step: "submitting" });
        let hash: string;
        if (isClassic) {
          hash = await submitClassicTx(signedXDR);
        } else {
          setTxRecord({ status: "pending", step: "confirming" });
          hash = await submitTransaction(signedXDR);
        }

        // Success
        setTxRecord({ status: "success", hash });

        // Update contract stats with real-time data
        updateContractState(amount);

        // Add to history
        const newTx: PaymentRecord = {
          id: hash,
          sender: address,
          recipient,
          amount,
          timestamp: Date.now(),
          txHash: hash,
          status: "success",
        };
        setTxHistory((prev) => {
          const updated = [newTx, ...prev].slice(0, 20);
          cacheTransactions(updated);
          return updated;
        });

        // Refresh balances
        await loadBalance(address);
        await loadContractState();

        pushToast(
          makeToast(
            "success",
            "Payment Sent!",
            `${amount} XLM sent to ${recipient.slice(0, 6)}…${recipient.slice(-4)}`
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        if (msg.startsWith("TransactionRejected:") || msg.includes("rejected")) {
          setTxRecord({
            status: "error",
            error: "Transaction rejected by wallet. No XLM was sent.",
          });
          pushToast(makeToast("warning", "Transaction Rejected", "You rejected the transaction in your wallet."));
        } else if (err instanceof InsufficientBalanceError) {
          setTxRecord({ status: "error", error: err.message });
          pushToast(makeToast("error", "Insufficient Balance", err.message));
        } else {
          setTxRecord({ status: "error", error: msg });
          pushToast(makeToast("error", "Transaction Failed", msg));
        }
      }
    },
    [address, loadBalance, loadContractState, pushToast]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-wrapper">
      <AuroraBackground />

      <Navbar
        connected={!!address}
        address={address}
        onConnect={handleConnect}
        connectLoading={connectLoading}
      />

      <ErrorToast toasts={toasts} onDismiss={dismissToast} />

      <main className="main-content">
        {!address ? (
          <HeroCard onConnect={handleConnect} loading={connectLoading} />
        ) : (
          <div className="dashboard-grid">
            {/* Left column */}
            <div className="dashboard-left">
              <SendPaymentForm
                address={address}
                balance={balance}
                txRecord={txRecord}
                onSend={handleSend}
                fromCache={balanceFromCache}
              />
            </div>

            {/* Right column */}
            <div className="dashboard-right">
              <WalletCard
                address={address}
                balance={balance}
                txHistory={txHistory}
                onDisconnect={handleDisconnect}
                balanceFromCache={balanceFromCache}
              />
              <ContractStatsCard
                state={contractState}
                loading={contractLoading}
                fromCache={contractFromCache}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
