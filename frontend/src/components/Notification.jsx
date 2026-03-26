import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useFarm } from '../context/FarmContext';

const ICONS = {
  success: <CheckCircle size={18} className="text-green-600" />,
  error:   <XCircle    size={18} className="text-red-500" />,
  info:    <Info       size={18} className="text-blue-500" />,
};

const BG = {
  success: 'bg-green-50 border-green-200',
  error:   'bg-red-50   border-red-200',
  info:    'bg-blue-50  border-blue-200',
};

export default function Notification() {
  const { notification, notify } = useFarm();
  if (!notification) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3
        rounded-xl border shadow-xl ${BG[notification.type]} fade-in`}
      style={{ minWidth: 260, maxWidth: 380 }}
    >
      {ICONS[notification.type]}
      <span className="text-sm font-medium text-gray-800 flex-1">{notification.message}</span>
      <button onClick={() => notify(null, null)} className="text-gray-400 hover:text-gray-600">
        <X size={15} />
      </button>
    </div>
  );
}
