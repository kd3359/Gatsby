/**
 * Main App Component
 * Wraps all pages with global providers and styles
 */

import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { socketService } from '@/services/socket';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  const { isAuthenticated, token, setUserCount, addMatch, addMessage, setTyping } = useStore();

  useEffect(() => {
    // Initialize socket connection if authenticated
    if (isAuthenticated && token) {
      socketService.connect(token);

      // Setup socket event listeners
      socketService.on('user_count_updated', (data: { count: number }) => {
        setUserCount(data.count);
      });

      socketService.on('new_match', (data: any) => {
        addMatch({
          matchId: data.matchId,
          matchedAt: new Date().toISOString(),
          user: data.user,
        });
      });

      socketService.on('new_message', (data: any) => {
        addMessage(data.matchId, {
          id: data.messageId,
          content: data.content,
          sender: data.sender,
          createdAt: data.createdAt,
        });
      });

      socketService.on('user_typing', (data: { userId: number }) => {
        setTyping(data.userId, true);
      });

      socketService.on('user_stopped_typing', (data: { userId: number }) => {
        setTyping(data.userId, false);
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  return (
    <>
      <Head>
        <title>Gatsby - Who&apos;s Here?</title>
        <meta name="description" content="Real-time venue matchmaking" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <div className="app-container min-h-screen bg-gatsby-black">
        <Component {...pageProps} />
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'bg-gatsby-charcoal text-white',
            style: {
              background: '#1A1F3A',
              color: '#fff',
            },
          }}
        />
      </div>
    </>
  );
}
