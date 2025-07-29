
"use client";

import { useState } from 'react';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';

export default function Home() {
  const [currentUser, setCurrentUser] = useState('User1');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header currentUser={currentUser} onUserChange={setCurrentUser} />
      <main className="flex-1">
        <Dashboard currentUser={currentUser} />
      </main>
    </div>
  );
}
