import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Sprout, Droplets,
  Leaf, ChevronRight, X,
} from 'lucide-react';
import { useFarm } from '../../context/FarmContext';

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'หน้าหลัก',         sub: 'Dashboard' },
  { to: '/zones',      icon: Map,             label: 'พื้นที่ปลูก',       sub: 'Zone Management' },
  { to: '/crops',      icon: Sprout,          label: 'แผนการเพาะปลูก',    sub: 'Crop Planner' },
  { to: '/irrigation', icon: Droplets,        label: 'ระบบน้ำ & IoT',    sub: 'Irrigation Control' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useFarm();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-farm-400 flex items-center justify-center shadow-lg">
              <Leaf size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">Smart Farm</div>
              <div className="text-farm-300 text-xs">ระบบจัดการฟาร์ม</div>
            </div>
          </div>
          <button
            className="text-white/60 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-white/35 text-xs font-semibold uppercase tracking-widest px-1 mb-1">
              เมนูหลัก
            </p>
          </div>
          {NAV_ITEMS.map(({ to, icon: Icon, label, sub }) => {
            const active = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={`nav-icon ${active ? 'text-farm-300' : 'text-white/50'}`}>
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{label}</div>
                  <div className="text-xs opacity-50 truncate">{sub}</div>
                </div>
                {active && <ChevronRight size={14} className="text-farm-300" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-farm-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">Farm Manager</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-online inline-block" />
                <span className="text-farm-300 text-xs">ออนไลน์</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
