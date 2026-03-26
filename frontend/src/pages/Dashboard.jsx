import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, CheckSquare, Square, Layers,
  Droplets, Cpu, CalendarClock, Thermometer,
  Wind, Leaf, TrendingUp, AlertTriangle, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import Header from '../components/Layout/Header';
import { fetchDashboardSummary, fetchTodayTasks, updateTaskStatus, fetchSensorHistory } from '../services/api';
import { useFarm } from '../context/FarmContext';

// ── Helpers ────────────────────────────────────────────────
const STATUS_LABEL = {
  vacant: 'ว่าง', preparing: 'เตรียม',
  growing: 'กำลังปลูก', ready_harvest: 'เก็บเกี่ยวได้', maintenance: 'ปรับปรุง',
};
const TASK_TYPE_ICON = {
  sow: '🌱', transplant: '🪴', water: '💧', fertilize: '🧪',
  harvest: '🌾', prune: '✂️', check: '🔍', general: '📋',
};
const PRIORITY_COLOR = {
  urgent: '#ef4444', high: '#f97316', normal: '#52b788', low: '#94a3b8',
};

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, value, label, sub, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub  && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ── Task Item ──────────────────────────────────────────────
function TaskItem({ task, onComplete }) {
  const done = task.status === 'completed';
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all
        priority-${task.priority}
        ${done ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-farm-50'}`}
    >
      <button
        onClick={() => !done && onComplete(task.task_id)}
        className="mt-0.5 flex-shrink-0 text-farm-500 hover:text-farm-700 transition-colors"
      >
        {done
          ? <CheckSquare size={20} className="text-farm-400" />
          : <Square size={20} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {TASK_TYPE_ICON[task.task_type] || '📋'} {task.title}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.zone_code && (
            <span className="text-xs text-farm-600 bg-farm-100 px-2 py-0.5 rounded-full font-medium">
              {task.zone_code}
            </span>
          )}
          {task.lot_number && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {task.lot_number}
            </span>
          )}
          {task.priority === 'urgent' && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <AlertTriangle size={10} /> ด่วน
            </span>
          )}
          {task.priority === 'high' && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-semibold">
              สำคัญ
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sensor Widget ──────────────────────────────────────────
function SensorWidget({ readings }) {
  const byZone = {};
  readings.forEach(r => {
    if (!byZone[r.zone_code]) byZone[r.zone_code] = { zone_code: r.zone_code, zone_name: r.zone_name };
    byZone[r.zone_code][r.parameter_type] = r.value;
  });

  return (
    <div className="grid grid-cols-1 gap-3">
      {Object.values(byZone).map(z => (
        <div key={z.zone_code}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-farm-50 border border-farm-100">
          <div>
            <div className="text-xs font-bold text-farm-700">{z.zone_code}</div>
            <div className="text-xs text-gray-400 truncate max-w-[120px]">{z.zone_name}</div>
          </div>
          <div className="flex items-center gap-4">
            {z.temperature && (
              <div className="text-center">
                <div className="text-sm font-bold text-orange-500">{z.temperature}°C</div>
                <div className="text-xs text-gray-400">อุณหภูมิ</div>
              </div>
            )}
            {z.humidity && (
              <div className="text-center">
                <div className="text-sm font-bold text-blue-500">{z.humidity}%</div>
                <div className="text-xs text-gray-400">ความชื้น</div>
              </div>
            )}
            {z.ec_level && (
              <div className="text-center">
                <div className="text-sm font-bold text-purple-500">{z.ec_level}</div>
                <div className="text-xs text-gray-400">EC</div>
              </div>
            )}
            {z.soil_moisture && (
              <div className="text-center">
                <div className="text-sm font-bold text-green-600">{z.soil_moisture}%</div>
                <div className="text-xs text-gray-400">ดิน</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Harvest Timeline ───────────────────────────────────────
function HarvestTimeline({ items }) {
  if (!items?.length)
    return <div className="text-center text-gray-400 text-sm py-6">ไม่มีการเก็บเกี่ยวในเร็วๆ นี้</div>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.lot_number}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-farm-100 hover:border-farm-300 transition-colors">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow"
            style={{ background: item.color_tag || '#52b788' }}
          >
            {item.days_left <= 0 ? '🌾' : item.days_left}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">{item.template_name}</div>
            <div className="text-xs text-gray-400">{item.zone_code} · {item.lot_number}</div>
            <div className="progress-bar mt-1.5">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(5, Math.min(100, ((14 - item.days_left) / 14) * 100))}%` }}
              />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {item.days_left <= 0
              ? <span className="badge badge-ready">พร้อมเก็บ</span>
              : <span className="text-sm font-bold text-farm-600">{item.days_left} วัน</span>
            }
            <div className="text-xs text-gray-400 mt-0.5">
              {item.expected_harvest_date
                ? format(parseISO(item.expected_harvest_date), 'd MMM', { locale: th })
                : '-'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mini Chart ─────────────────────────────────────────────
function MiniChart({ data, dataKey, color, unit }) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          formatter={(v) => [`${v} ${unit}`, '']}
          labelFormatter={(l) => l}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#g-${dataKey})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const { notifySuccess, notifyError } = useFarm();
  const [summary,   setSummary]   = useState(null);
  const [tasks,     setTasks]     = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetchDashboardSummary(),
        fetchTodayTasks(),
      ]);
      setSummary(s.data);
      setTasks(t.data);

      // Demo chart data (replace with real sensor history API)
      const now = new Date();
      const demo = Array.from({ length: 12 }, (_, i) => ({
        time: format(new Date(now.getTime() - (11 - i) * 3600000), 'HH:mm'),
        temp: +(28 + Math.random() * 5).toFixed(1),
        humidity: +(65 + Math.random() * 20).toFixed(1),
      }));
      setChartData(demo);
    } catch (e) {
      notifyError('โหลดข้อมูลไม่สำเร็จ: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => { load(); }, [load]);

  const completeTask = async (id) => {
    try {
      await updateTaskStatus(id, 'completed');
      setTasks(prev => prev.map(t => t.task_id === id ? { ...t, status: 'completed' } : t));
      notifySuccess('ทำภารกิจเสร็จแล้ว!');
    } catch (e) {
      notifyError(e.message);
    }
  };

  const pendingTasks    = tasks.filter(t => t.status !== 'completed');
  const completedTasks  = tasks.filter(t => t.status === 'completed');
  const completionRate  = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const zs = summary?.zoneStats    || {};
  const ds = summary?.deviceStats  || {};

  return (
    <>
      <Header title="หน้าหลัก" onRefresh={load} loading={loading} />

      <div className="page-body fade-in">
        {/* ── Stat Row ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Layers}    iconBg="#2d6a4f"
            value={zs.growing || 0}
            label="โซนกำลังปลูก"
            sub={`ว่าง ${zs.vacant || 0} โซน`}
          />
          <StatCard
            icon={CheckSquare} iconBg="#0284c7"
            value={`${completionRate}%`}
            label="ภารกิจวันนี้"
            sub={`${completedTasks.length}/${tasks.length} รายการ`}
          />
          <StatCard
            icon={Leaf}       iconBg="#16a34a"
            value={zs.ready_harvest || 0}
            label="พร้อมเก็บเกี่ยว"
            sub="โซน"
          />
          <StatCard
            icon={Cpu}        iconBg="#7c3aed"
            value={ds.active || 0}
            label="อุปกรณ์ทำงาน"
            sub={`ออฟไลน์ ${ds.offline || 0} ตัว`}
          />
        </div>

        {/* ── Main Grid ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Daily Missions */}
          <div className="lg:col-span-2 card">
            <div className="card-title">
              <CheckSquare size={15} />
              ภารกิจวันนี้
              <span className="ml-auto badge badge-growing">{pendingTasks.length} รายการ</span>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>ความคืบหน้า</span>
                <span className="font-semibold text-farm-600">{completionRate}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pendingTasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-gray-600 font-medium">ทำภารกิจทั้งหมดเสร็จแล้ว!</div>
                <div className="text-gray-400 text-sm">ยอดเยี่ยมมาก วันนี้คุณทำงานหนักมาก</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {pendingTasks.map(t => (
                  <TaskItem key={t.task_id} task={t} onComplete={completeTask} />
                ))}
                {completedTasks.length > 0 && (
                  <>
                    <div className="text-xs text-gray-400 font-semibold pt-2 pb-1 px-1">
                      เสร็จแล้ว ({completedTasks.length})
                    </div>
                    {completedTasks.map(t => (
                      <TaskItem key={t.task_id} task={t} onComplete={completeTask} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-5">

            {/* Upcoming Harvest */}
            <div className="card">
              <div className="card-title">
                <CalendarClock size={15} />
                เก็บเกี่ยวเร็วๆ นี้
              </div>
              <HarvestTimeline items={summary?.upcomingHarvests} />
            </div>

            {/* Zone Summary */}
            <div className="card">
              <div className="card-title"><Layers size={15} /> ภาพรวมโซน</div>
              <div className="space-y-2">
                {[
                  { label: 'กำลังปลูก',      val: zs.growing,       color: '#16a34a', bg: '#dcfce7' },
                  { label: 'พร้อมเก็บเกี่ยว', val: zs.ready_harvest, color: '#1d4ed8', bg: '#dbeafe' },
                  { label: 'เตรียมดิน/น้ำ',   val: zs.preparing,     color: '#ca8a04', bg: '#fef9c3' },
                  { label: 'ว่าง',             val: zs.vacant,        color: '#6b7280', bg: '#f3f4f6' },
                  { label: 'ปรับปรุง',          val: zs.maintenance,   color: '#dc2626', bg: '#fee2e2' },
                ].map(({ label, val, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="text-sm text-gray-700 flex-1">{label}</div>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                      style={{ color, background: bg }}>
                      {val || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts Row ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <div className="card">
            <div className="card-title"><Thermometer size={15} /> อุณหภูมิ 12 ชั่วโมง</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[25, 40]} />
                <Tooltip
                  formatter={(v) => [`${v} °C`, 'อุณหภูมิ']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2}
                  fill="url(#gTemp)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title"><Wind size={15} /> ความชื้นสัมพัทธ์ 12 ชั่วโมง</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[40, 100]} />
                <Tooltip
                  formatter={(v) => [`${v} %`, 'ความชื้น']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="humidity" stroke="#0ea5e9" strokeWidth={2}
                  dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Sensor Grid ──────────────────────────────── */}
        {summary?.sensorReadings?.length > 0 && (
          <div className="card mt-5">
            <div className="card-title"><TrendingUp size={15} /> ค่าเซนเซอร์ล่าสุด</div>
            <SensorWidget readings={summary.sensorReadings} />
          </div>
        )}
      </div>
    </>
  );
}
