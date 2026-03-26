import React from 'react';
import { Menu, Bell, RefreshCw } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';

export default function Header({ title, subtitle, onRefresh, loading, children }) {
  const { setSidebarOpen } = useFarm();
  const now = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="page-header">
      <div className="flex items-center gap-3">
        <button
          className="btn-icon md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-farm-800 leading-tight">{title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle || now}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onRefresh && (
          <button
            className="btn-icon"
            onClick={onRefresh}
            disabled={loading}
            title="รีเฟรช"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
        <button className="btn-icon relative">
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
