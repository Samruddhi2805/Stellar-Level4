import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { getStreamingService } from '../../lib/blockchainStreaming';
import { useAppStore } from '../../store/appStore';
import Navbar from './Navbar';
import NotificationToast from '../Common/NotificationToast';
import LiveTransactionFeed from '../Features/LiveTransactionFeed';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { notifications, removeNotification } = useAppStore();

  useEffect(() => {
    // Initialize blockchain streaming
    const streamingService = getStreamingService();
    streamingService.start();

    return () => {
      streamingService.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-stellar-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-stellar-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-aurora"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-aurora" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-aurora" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>

      {/* Main content */}
      <div className="relative z-10">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            {/* Main content area */}
            <div className="lg:col-span-3">
              {children}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <LiveTransactionFeed />
            </div>
          </motion.div>
        </main>
      </div>

      {/* Notification container */}
      <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default MainLayout;
