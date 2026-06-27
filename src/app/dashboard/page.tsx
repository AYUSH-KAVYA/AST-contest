'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ContestBuilder from '@/components/admin/ContestBuilder';
import LiveScheduler from '@/components/admin/LiveScheduler';
import LiveProctor from '@/components/admin/LiveProctor';
import ResultsViewer from '@/components/admin/ResultsViewer';

type Tab = 'builder' | 'scheduler' | 'proctor' | 'results';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'builder', label: 'Contest Builder', icon: '✏️' },
  { key: 'scheduler', label: 'Live Scheduler', icon: '🚀' },
  { key: 'proctor', label: 'Live Proctor', icon: '👁️' },
  { key: 'results', label: 'Results & Insights', icon: '📊' },
];

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('builder');

  return (
    <div className="min-h-screen bg-[#090d16]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#141a2b]/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 via-rose-600 to-amber-800 flex items-center justify-center shadow-md shadow-pink-500/20 border border-white/10">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">Akkiyu School of Technology</h1>
                <p className="text-slate-400 text-xs font-medium">Admin Control Panel &bull; SSC CGL</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm font-medium hidden sm:block">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold rounded-xl hover:bg-white/10 hover:text-white transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-white/10 bg-[#090d16]/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-pink-600 to-amber-700 text-white shadow-md shadow-pink-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeIn_0.3s_ease-out]">
        {activeTab === 'builder' && <ContestBuilder />}
        {activeTab === 'scheduler' && <LiveScheduler />}
        {activeTab === 'proctor' && <LiveProctor />}
        {activeTab === 'results' && <ResultsViewer />}
      </main>
    </div>
  );
}
