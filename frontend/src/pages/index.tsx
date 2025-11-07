/**
 * Landing Page
 * Entry point for the app - redirects to QR scan or app
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useStore();

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated) {
      router.push('/app');
    } else {
      // Show landing page with instructions
      // In production, this would show QR code scanner or instructions
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <h1 className="font-display text-6xl text-gatsby-gold">gatsby</h1>
        <p className="text-gatsby-gray text-lg">Who&apos;s here?</p>

        {/* Instructions */}
        <div className="card space-y-4">
          <h2 className="text-2xl font-bold">Get Started</h2>
          <p className="text-gatsby-gray">
            Scan the QR code at your venue to join the party and start matching with people nearby.
          </p>

          <div className="pt-4">
            <button
              onClick={() => router.push('/join/demo-session-uuid')}
              className="btn-primary w-full"
            >
              Demo Mode (For Testing)
            </button>
          </div>

          <p className="text-sm text-gatsby-gray pt-4">
            Real-time matchmaking • Chat instantly • Exchange contacts
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 pt-8">
          <div className="text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-gatsby-gray">Join Events</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">❤️</div>
            <p className="text-sm text-gatsby-gray">Match Live</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm text-gatsby-gray">Chat Now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
