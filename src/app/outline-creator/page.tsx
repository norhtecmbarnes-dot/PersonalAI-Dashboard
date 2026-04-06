'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OutlineCreatorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/writing-studio');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to Writing Studio...</p>
      </div>
    </div>
  );
}
