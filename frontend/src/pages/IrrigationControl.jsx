import React, { useState, useEffect, useCallback } from 'react';
import {
  Droplets, Zap, Clock, Settings, Plus, Trash2,
  Edit2, X, Save, Wifi, WifiOff, Play, Square,
  Thermometer, Wind, Gauge, Lightbulb, Fan,
} from 'lucide-react';
import Header from '../components/Layout/Header';
import {
  fetchDevices, toggleDevice, setDeviceState, createDevice, deleteDevice,
  fetchSchedules, createSchedule, updateSchedule, toggleSchedule, deleteSchedule,
  fetchRules, createRule, updateRule, toggleRule, deleteRule,
  fetchZones,
} from '../services/api';
import { useFarm } from '../context/FarmContext';

// ── Constants ──────────────────────────────────────────────
const DEVICE_TYPES = [
  { value: 'water_pump',  label: 'ปั๊มน้ำ',       icon: Droplets,     color: '#0ea5e9', bg: '#e0f2fe' },
  { value: 'mist_nozzle', label: 'หัวพ่นหมอก',    icon: Wind,         color: '#06b6d4', bg: '#cffafe' },
  { value: 'led_light',   label: 'ไฟ LED',        icon: Lightbulb,    color: '#f59e0b', bg: '#fef3c7' },
  { value: 'fan',         label: 'พัดลม',         icon: Fan,          color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'valve',       label: 'วาล์วน้ำ',      icon: Settings,     color: '#10b981', bg: '#d1fae5' },
];
const DEVICE_TYPE_MAP = Object.fromEntries(DEVICE_TYPES.map(d => [d.value, d]));

const SENSOR_PARAMS = [
  { value: 'temperature',    label: 'อุณหภูมิ',           unit: '°C',   icon: Thermometer },
  { value: 'humidity',       label: 'ความชื้นอากาศ',       unit: '%',    icon: Wind },
  { value: 'soil_moisture',  label: 'ความชื้นดิน',         unit: '%',    icon: Droplets },
  { value: 'ec_level',       label: 'EC',                 unit: 'mS/cm',icon: Gauge },
  { value: 'ph_level',       label: 'pH',                 unit: '',     icon: Gauge },
  { value: 'light_intensity',label: 'ความเข้มแสง',         unit: 'lux',  icon: Lightbulb },
];
const SENSOR_PARAM_MAP = Object.fromEntries(SENSOR_PARAMS.map(s => [s.value, s]));

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

function daysStr(str = '1111111') {
  return DAYS.filter((_, i) => str[i] === '1').join(', ') || 'ไม่มีวัน';
}

// ── Device Card ────────────────────────────────────────────
function DeviceCard({ device, onToggle, onDelete }) {
  const dt      = DEVICE_TYPE_MAP[device.device_type] || DEVICE_TYPES[0];
  const Icon    = dt.icon;
  const isOn    = device.current_state === 'on';
  const offline = !device.is_online;

  return (
    <div className={`device-card ${isOn ? 'device-on' : 'device-off'} ${offline ? 'offline' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="device-icon" style={{ background: isOn ? dt.color + '25' : '#f3f4f6' }}>
          <Icon size={20} style={{ color: isOn ? dt.color : '#9ca3af' }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800 truncate">{device.device_name}</div>
          <div className="text-xs text-gray-400 truncate">{device.zone_code} · {dt.label}</div>
          {device.last_triggered && (
            <div className="text-xs text-gray-300 mt-0.5">
              ล่าสุด: {new Date(device.last_triggered).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {offline ? (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <WifiOff size={13} /> ออฟไลน์
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Wifi size={13} />
            <span className={isOn ? 'text-green-600 font-semibold' : 'text-gray-400'}>
              {isOn ? 'ON' : 'OFF'}
            </span>
          </div>
        )}
        <label className="toggle" title={offline ? 'ออฟไลน์' : (isOn ? 'ปิด' : 'เปิด')}>
          <input type="checkbox" checked={isOn} disabled={offline}
            onChange={() => !offline && onToggle(device.device_id)} />
          <span className="toggle-slider" />
        </label>
        <button className="btn-icon btn-sm text-red-400 hover:text-red-600"
          onClick={() => onDelete(device.device_id)}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Add Device Modal ───────────────────────────────────────
function DeviceModal({ zones, onClose, onSave }) {
  const [form, setForm] = useState({ zone_id: '', device_name: '', device_type: 'water_pump', device_code: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">เพิ่มอุปกรณ์ IoT</h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">ชื่ออุปกรณ์ *</label>
              <input className="form-input" value={form.device_name}
                onChange={e => set('device_name', e.target.value)} placeholder="เช่น ปั๊มน้ำ T-01" required />
            </div>
            <div className="form-group">
              <label className="form-label">ประเภทอุปกรณ์</label>
              <select className="form-select" value={form.device_type}
                onChange={e => set('device_type', e.target.value)}>
                {DEVICE_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">โซน</label>
              <select className="form-select" value={form.zone_id}
                onChange={e => set('zone_id', e.target.value)}>
                <option value="">ไม่ระบุโซน</option>
                {zones.map(z => (
                  <option key={z.zone_id} value={z.zone_id}>{z.zone_code} — {z.zone_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">รหัสอุปกรณ์ (Device Code)</label>
              <input className="form-input" value={form.device_code}
                onChange={e => set('device_code', e.target.value)} placeholder="DEV-XXXX" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Schedule Form Modal ────────────────────────────────────
function ScheduleModal({ devices, schedule, onClose, onSave }) {
  const [form, setForm] = useState(schedule || {
    device_id: '', schedule_name: '', trigger_time: '08:00',
    days_of_week: '1111111', duration_minutes: 10,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleDay = (i) => {
    const arr = (form.days_of_week || '1111111').split('');
    arr[i] = arr[i] === '1' ? '0' : '1';
    set('days_of_week', arr.join(''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">
            {schedule?.schedule_id ? 'แก้ไขตารางเวลา' : 'เพิ่มตารางเวลา'}
          </h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">อุปกรณ์ *</label>
              <select className="form-select" value={form.device_id}
                onChange={e => set('device_id', e.target.value)} required>
                <option value="">เลือกอุปกรณ์</option>
                {devices.map(d => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.device_name} ({d.zone_code || 'ไม่มีโซน'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ชื่อตาราง</label>
              <input className="form-input" value={form.schedule_name}
                onChange={e => set('schedule_name', e.target.value)} placeholder="เช่น รดน้ำเช้า" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">เวลา *</label>
                <input className="form-input" type="time" value={form.trigger_time}
                  onChange={e => set('trigger_time', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">ระยะเวลา (นาที)</label>
                <input className="form-input" type="number" min="1" value={form.duration_minutes}
                  onChange={e => set('duration_minutes', +e.target.value)} />
              </div>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">วันที่ทำงาน</label>
              <div className="flex gap-2 mt-1.5">
                {DAYS.map((d, i) => (
                  <button key={i} type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-full text-sm font-semibold transition-all
                      ${(form.days_of_week || '1111111')[i] === '1'
                        ? 'bg-farm-600 text-white shadow'
                        : 'bg-gray-100 text-gray-400'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Automation Rule Modal ──────────────────────────────────
function RuleModal({ zones, devices, rule, onClose, onSave }) {
  const [form, setForm] = useState(rule || {
    zone_id: '', device_id: '', rule_name: '',
    sensor_parameter: 'soil_moisture', condition_operator: '<',
    threshold_value: '', action: 'turn_on',
    duration_minutes: 5, cooldown_minutes: 30,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const param   = SENSOR_PARAM_MAP[form.sensor_parameter];
  const preview = form.threshold_value
    ? `ถ้า ${param?.label || form.sensor_parameter} ${form.condition_operator} ${form.threshold_value} ${param?.unit || ''} → ${form.action === 'turn_on' ? 'เปิด' : 'ปิด'}อุปกรณ์ ${form.duration_minutes} นาที`
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">
            {rule?.rule_id ? 'แก้ไขกฎอัตโนมัติ' : 'เพิ่มกฎอัตโนมัติ'}
          </h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">ชื่อกฎ *</label>
              <input className="form-input" value={form.rule_name}
                onChange={e => set('rule_name', e.target.value)} required placeholder="เช่น รดน้ำเมื่อดินแห้ง" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">โซนที่ตรวจ *</label>
                <select className="form-select" value={form.zone_id}
                  onChange={e => set('zone_id', e.target.value)} required>
                  <option value="">เลือกโซน</option>
                  {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_code} — {z.zone_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">อุปกรณ์ที่สั่งงาน *</label>
                <select className="form-select" value={form.device_id}
                  onChange={e => set('device_id', e.target.value)} required>
                  <option value="">เลือกอุปกรณ์</option>
                  {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_name}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border mb-3">
              <div className="text-xs font-bold text-gray-600 mb-3">เงื่อนไข (IF … THEN …)</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label">พารามิเตอร์</label>
                  <select className="form-select" value={form.sensor_parameter}
                    onChange={e => set('sensor_parameter', e.target.value)}>
                    {SENSOR_PARAMS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">เงื่อนไข</label>
                  <select className="form-select" value={form.condition_operator}
                    onChange={e => set('condition_operator', e.target.value)}>
                    <option value="<">น้อยกว่า (&lt;)</option>
                    <option value="<=">น้อยกว่าหรือเท่ากับ (≤)</option>
                    <option value=">">มากกว่า (&gt;)</option>
                    <option value=">=">มากกว่าหรือเท่ากับ (≥)</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">ค่า {param?.unit && `(${param.unit})`}</label>
                  <input className="form-input" type="number" step="0.1"
                    value={form.threshold_value} onChange={e => set('threshold_value', e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="form-group mb-0">
                  <label className="form-label">การกระทำ</label>
                  <select className="form-select" value={form.action}
                    onChange={e => set('action', e.target.value)}>
                    <option value="turn_on">เปิดอุปกรณ์</option>
                    <option value="turn_off">ปิดอุปกรณ์</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">นานกี่นาที</label>
                  <input className="form-input" type="number" min="1"
                    value={form.duration_minutes} onChange={e => set('duration_minutes', +e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">คูลดาวน์ (นาที)</label>
                  <input className="form-input" type="number" min="1"
                    value={form.cooldown_minutes} onChange={e => set('cooldown_minutes', +e.target.value)} />
                </div>
              </div>
            </div>
            {preview && (
              <div className="text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-2.5">
                🤖 {preview}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function IrrigationControl() {
  const { notifySuccess, notifyError } = useFarm();
  const [devices,   setDevices]   = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [rules,     setRules]     = useState([]);
  const [zones,     setZones]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('devices');

  const [devModal,   setDevModal]   = useState(false);
  const [schedModal, setSchedModal] = useState(null);  // null | {} | schedule
  const [ruleModal,  setRuleModal]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dev, sch, rul, zon] = await Promise.all([
        fetchDevices(), fetchSchedules(), fetchRules(), fetchZones(),
      ]);
      setDevices(dev.data);
      setSchedules(sch.data);
      setRules(rul.data);
      setZones(zon.data);
    } catch (e) {
      notifyError(e.message);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => { load(); }, [load]);

  // ── Device handlers ──────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const res = await toggleDevice(id);
      setDevices(prev => prev.map(d =>
        d.device_id === id ? { ...d, current_state: res.data.current_state } : d
      ));
    } catch (e) { notifyError(e.message); }
  };

  const handleSaveDevice = async (form) => {
    try {
      await createDevice(form);
      notifySuccess('เพิ่มอุปกรณ์เรียบร้อย');
      setDevModal(false); load();
    } catch (e) { notifyError(e.message); }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('ลบอุปกรณ์นี้ใช่ไหม?')) return;
    try {
      await deleteDevice(id);
      notifySuccess('ลบอุปกรณ์แล้ว');
      load();
    } catch (e) { notifyError(e.message); }
  };

  const handleAllOff = async () => {
    if (!window.confirm('ปิดอุปกรณ์ทั้งหมดใช่ไหม?')) return;
    try {
      await Promise.all(
        devices.filter(d => d.current_state === 'on').map(d => setDeviceState(d.device_id, 'off'))
      );
      notifySuccess('ปิดอุปกรณ์ทั้งหมดแล้ว');
      load();
    } catch (e) { notifyError(e.message); }
  };

  // ── Schedule handlers ─────────────────────────────────────
  const handleSaveSchedule = async (form) => {
    try {
      if (form.schedule_id) {
        await updateSchedule(form.schedule_id, form);
        notifySuccess('อัปเดตตารางเวลาเรียบร้อย');
      } else {
        await createSchedule(form);
        notifySuccess('เพิ่มตารางเวลาเรียบร้อย');
      }
      setSchedModal(null); load();
    } catch (e) { notifyError(e.message); }
  };

  const handleToggleSchedule = async (id) => {
    try {
      await toggleSchedule(id);
      setSchedules(prev => prev.map(s =>
        s.schedule_id === id ? { ...s, is_enabled: s.is_enabled ? 0 : 1 } : s
      ));
    } catch (e) { notifyError(e.message); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('ลบตารางเวลานี้ใช่ไหม?')) return;
    try {
      await deleteSchedule(id);
      notifySuccess('ลบตารางเวลาแล้ว');
      load();
    } catch (e) { notifyError(e.message); }
  };

  // ── Rule handlers ─────────────────────────────────────────
  const handleSaveRule = async (form) => {
    try {
      if (form.rule_id) {
        await updateRule(form.rule_id, form);
        notifySuccess('อัปเดตกฎเรียบร้อย');
      } else {
        await createRule(form);
        notifySuccess('เพิ่มกฎอัตโนมัติเรียบร้อย');
      }
      setRuleModal(null); load();
    } catch (e) { notifyError(e.message); }
  };

  const handleToggleRule = async (id) => {
    try {
      await toggleRule(id);
      setRules(prev => prev.map(r =>
        r.rule_id === id ? { ...r, is_enabled: r.is_enabled ? 0 : 1 } : r
      ));
    } catch (e) { notifyError(e.message); }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('ลบกฎนี้ใช่ไหม?')) return;
    try {
      await deleteRule(id);
      notifySuccess('ลบกฎแล้ว');
      load();
    } catch (e) { notifyError(e.message); }
  };

  const onlineCount = devices.filter(d => d.is_online).length;
  const activeCount = devices.filter(d => d.current_state === 'on').length;

  return (
    <>
      <Header title="ระบบน้ำ & IoT" subtitle="Irrigation & IoT Control" onRefresh={load} loading={loading}>
        {devices.some(d => d.current_state === 'on') && (
          <button className="btn btn-danger btn-sm" onClick={handleAllOff}>
            <Square size={14} /> ปิดทั้งหมด
          </button>
        )}
      </Header>

      <div className="page-body fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#0284c7' }}><Droplets size={20} className="text-white" /></div>
            <div>
              <div className="stat-value">{devices.length}</div>
              <div className="stat-label">อุปกรณ์ทั้งหมด</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#16a34a' }}><Play size={20} className="text-white" /></div>
            <div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-label">กำลังทำงาน</div>
              <div className="text-xs text-gray-400">{onlineCount} ออนไลน์</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#7c3aed' }}><Zap size={20} className="text-white" /></div>
            <div>
              <div className="stat-value">{rules.filter(r => r.is_enabled).length}</div>
              <div className="stat-label">กฎอัตโนมัติ</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { key: 'devices',   label: 'อุปกรณ์',       icon: Droplets },
            { key: 'schedules', label: 'ตารางเวลา',      icon: Clock },
            { key: 'rules',     label: 'กฎอัตโนมัติ',    icon: Zap },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost border-0'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Devices Tab ─────────────────────────────── */}
        {tab === 'devices' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">{devices.length} อุปกรณ์ · {activeCount} กำลังทำงาน</div>
              <button className="btn btn-primary btn-sm" onClick={() => setDevModal(true)}>
                <Plus size={14} /> เพิ่มอุปกรณ์
              </button>
            </div>
            {loading ? (
              <div className="grid gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : devices.length === 0 ? (
              <div className="card text-center py-14">
                <div className="text-4xl mb-3">🔌</div>
                <div className="text-gray-500">ยังไม่มีอุปกรณ์ IoT</div>
                <button className="btn btn-primary mt-4 mx-auto" onClick={() => setDevModal(true)}>
                  <Plus size={15} /> เพิ่มอุปกรณ์แรก
                </button>
              </div>
            ) : (
              <>
                {/* Group by zone */}
                {(() => {
                  const byZone = {};
                  devices.forEach(d => {
                    const key = d.zone_code || 'ไม่มีโซน';
                    if (!byZone[key]) byZone[key] = [];
                    byZone[key].push(d);
                  });
                  return Object.entries(byZone).map(([zone, devs]) => (
                    <div key={zone} className="mb-4">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                        {zone}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {devs.map(d => (
                          <DeviceCard key={d.device_id} device={d}
                            onToggle={handleToggle}
                            onDelete={handleDeleteDevice}
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </>
            )}
          </>
        )}

        {/* ── Schedules Tab ───────────────────────────── */}
        {tab === 'schedules' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">{schedules.length} ตาราง</div>
              <button className="btn btn-primary btn-sm" onClick={() => setSchedModal({})}>
                <Plus size={14} /> เพิ่มตาราง
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : schedules.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-3xl mb-2">⏰</div>
                <div className="text-gray-500">ยังไม่มีตารางเวลา</div>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map(s => (
                  <div key={s.schedule_id}
                    className={`card flex items-center gap-4 ${!s.is_enabled ? 'opacity-50' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock size={22} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">
                          {s.schedule_name || s.device_name}
                        </span>
                        {!s.is_enabled && <span className="badge badge-vacant">หยุด</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {s.device_name} · {s.zone_code || 'ไม่มีโซน'}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>🕐 {s.trigger_time?.substring(0,5)}</span>
                        <span>⏱ {s.duration_minutes} นาที</span>
                        <span>📅 {daysStr(s.days_of_week)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="toggle">
                        <input type="checkbox" checked={!!s.is_enabled}
                          onChange={() => handleToggleSchedule(s.schedule_id)} />
                        <span className="toggle-slider" />
                      </label>
                      <button className="btn-icon btn-sm"
                        onClick={() => setSchedModal(s)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn-icon btn-sm text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteSchedule(s.schedule_id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Rules Tab ───────────────────────────────── */}
        {tab === 'rules' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">{rules.length} กฎ</div>
              <button className="btn btn-primary btn-sm" onClick={() => setRuleModal({})}>
                <Plus size={14} /> เพิ่มกฎ
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : rules.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-gray-500">ยังไม่มีกฎอัตโนมัติ</div>
                <button className="btn btn-primary mt-4 mx-auto" onClick={() => setRuleModal({})}>
                  <Plus size={15} /> เพิ่มกฎแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(r => {
                  const param = SENSOR_PARAM_MAP[r.sensor_parameter];
                  const ParamIcon = param?.icon || Gauge;
                  return (
                    <div key={r.rule_id}
                      className={`card ${!r.is_enabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Zap size={20} className="text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800">{r.rule_name}</span>
                            {!r.is_enabled && <span className="badge badge-vacant">ปิดอยู่</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {r.zone_code || '-'} · {r.device_name || '-'}
                          </div>
                          <div className="mt-2 p-2.5 bg-gray-50 rounded-xl text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <ParamIcon size={13} className="text-gray-500" />
                              <span className="text-gray-600">
                                ถ้า <strong>{param?.label}</strong> {r.condition_operator} <strong>{r.threshold_value} {param?.unit}</strong>
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className={r.action === 'turn_on' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                                {r.action === 'turn_on' ? '🟢 เปิด' : '🔴 ปิด'} {r.duration_minutes} นาที
                              </span>
                              <span className="text-gray-400">| คูลดาวน์ {r.cooldown_minutes} นาที</span>
                            </div>
                          </div>
                          {r.last_triggered && (
                            <div className="text-xs text-gray-300 mt-1">
                              ทำงานล่าสุด: {new Date(r.last_triggered).toLocaleString('th-TH')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label className="toggle">
                            <input type="checkbox" checked={!!r.is_enabled}
                              onChange={() => handleToggleRule(r.rule_id)} />
                            <span className="toggle-slider" />
                          </label>
                          <button className="btn-icon btn-sm" onClick={() => setRuleModal(r)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn-icon btn-sm text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteRule(r.rule_id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {devModal   && <DeviceModal   zones={zones} onClose={() => setDevModal(false)} onSave={handleSaveDevice} />}
      {schedModal !== null && <ScheduleModal devices={devices} schedule={schedModal.schedule_id ? schedModal : undefined} onClose={() => setSchedModal(null)} onSave={handleSaveSchedule} />}
      {ruleModal  !== null && <RuleModal    zones={zones} devices={devices} rule={ruleModal.rule_id ? ruleModal : undefined} onClose={() => setRuleModal(null)} onSave={handleSaveRule} />}
    </>
  );
}
