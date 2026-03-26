import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Map, List, Eye,
  Droplet, Leaf, TreeDeciduous, X, Save,
} from 'lucide-react';
import Header from '../components/Layout/Header';
import { fetchZones, createZone, updateZone, deleteZone } from '../services/api';
import { useFarm } from '../context/FarmContext';

// ── Constants ──────────────────────────────────────────────
const STATUS_LIST = [
  { value: 'vacant',        label: 'ว่าง',              cls: 'badge-vacant'      },
  { value: 'preparing',     label: 'กำลังเตรียม',        cls: 'badge-preparing'   },
  { value: 'growing',       label: 'กำลังปลูก',          cls: 'badge-growing'     },
  { value: 'ready_harvest', label: 'พร้อมเก็บเกี่ยว',    cls: 'badge-ready'       },
  { value: 'maintenance',   label: 'ปรับปรุง',            cls: 'badge-maintenance' },
];
const STATUS_MAP  = Object.fromEntries(STATUS_LIST.map(s => [s.value, s]));
const ZONE_TYPES  = [
  { value: 'hydroponics',    label: 'โต๊ะไฮโดรโปนิกส์', icon: Droplet,       color: '#0ea5e9' },
  { value: 'soil_bed',       label: 'แปลงดิน',           icon: Leaf,          color: '#22c55e' },
  { value: 'perennial_tree', label: 'ไม้ยืนต้น',         icon: TreeDeciduous, color: '#84cc16' },
];
const ZONE_TYPE_MAP = Object.fromEntries(ZONE_TYPES.map(t => [t.value, t]));

const STATUS_CELL_CLS = {
  vacant:        'zone-vacant',
  preparing:     'zone-preparing',
  growing:       'zone-growing',
  ready_harvest: 'zone-ready',
  maintenance:   'zone-maintenance',
};

const EMPTY_FORM = {
  zone_code: '', zone_name: '', zone_type: 'hydroponics',
  status: 'vacant', area_sqm: '', notes: '',
  map_x: 0, map_y: 0, map_w: 2, map_h: 2,
  ec_level: '', ph_level: '', water_cycle_minutes: '',
  soil_moisture_pct: '', fertilize_interval_days: '', prune_interval_days: '',
};

// ── Zone Form Modal ────────────────────────────────────────
function ZoneModal({ zone, onClose, onSave }) {
  const [form, setForm] = useState(zone ? { ...EMPTY_FORM, ...zone } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.zone_code || !form.zone_name) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">
            {zone ? 'แก้ไขโซน' : 'เพิ่มโซนใหม่'}
          </h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">รหัสโซน *</label>
                <input className="form-input" value={form.zone_code}
                  onChange={e => set('zone_code', e.target.value)}
                  placeholder="เช่น T-01, B-01" required />
              </div>
              <div className="form-group">
                <label className="form-label">ชื่อโซน *</label>
                <input className="form-input" value={form.zone_name}
                  onChange={e => set('zone_name', e.target.value)}
                  placeholder="ชื่อพื้นที่" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">ประเภทพื้นที่</label>
                <select className="form-select" value={form.zone_type}
                  onChange={e => set('zone_type', e.target.value)}>
                  {ZONE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">สถานะ</label>
                <select className="form-select" value={form.status}
                  onChange={e => set('status', e.target.value)}>
                  {STATUS_LIST.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">พื้นที่ (ตร.ม.)</label>
                <input className="form-input" type="number" step="0.1" value={form.area_sqm}
                  onChange={e => set('area_sqm', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">ตำแหน่งแผนที่ (X, Y)</label>
                <div className="flex gap-2">
                  <input className="form-input" type="number" value={form.map_x}
                    onChange={e => set('map_x', +e.target.value)} placeholder="X" />
                  <input className="form-input" type="number" value={form.map_y}
                    onChange={e => set('map_y', +e.target.value)} placeholder="Y" />
                </div>
              </div>
            </div>

            {/* Type-specific fields */}
            {form.zone_type === 'hydroponics' && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-3">
                <div className="text-xs font-bold text-blue-600 mb-2">ค่าน้ำไฮโดรโปนิกส์</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="form-group mb-0">
                    <label className="form-label">EC (mS/cm)</label>
                    <input className="form-input" type="number" step="0.01"
                      value={form.ec_level} onChange={e => set('ec_level', e.target.value)} placeholder="1.8" />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">pH</label>
                    <input className="form-input" type="number" step="0.1"
                      value={form.ph_level} onChange={e => set('ph_level', e.target.value)} placeholder="6.2" />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">รอบน้ำ (นาที)</label>
                    <input className="form-input" type="number"
                      value={form.water_cycle_minutes} onChange={e => set('water_cycle_minutes', e.target.value)} placeholder="15" />
                  </div>
                </div>
              </div>
            )}
            {form.zone_type === 'soil_bed' && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-100 mb-3">
                <div className="text-xs font-bold text-green-700 mb-2">ข้อมูลแปลงดิน</div>
                <div className="form-group mb-0">
                  <label className="form-label">ความชื้นดิน (%)</label>
                  <input className="form-input" type="number" step="0.1"
                    value={form.soil_moisture_pct} onChange={e => set('soil_moisture_pct', e.target.value)} placeholder="60" />
                </div>
              </div>
            )}
            {form.zone_type === 'perennial_tree' && (
              <div className="p-3 bg-lime-50 rounded-xl border border-lime-100 mb-3">
                <div className="text-xs font-bold text-lime-700 mb-2">ข้อมูลไม้ยืนต้น</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group mb-0">
                    <label className="form-label">รอบใส่ปุ๋ย (วัน)</label>
                    <input className="form-input" type="number"
                      value={form.fertilize_interval_days} onChange={e => set('fertilize_interval_days', e.target.value)} placeholder="30" />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">รอบตัดแต่ง (วัน)</label>
                    <input className="form-input" type="number"
                      value={form.prune_interval_days} onChange={e => set('prune_interval_days', e.target.value)} placeholder="90" />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group mb-0">
              <label className="form-label">หมายเหตุ</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={e => set('notes', e.target.value)} placeholder="บันทึกเพิ่มเติม..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Visual Map ─────────────────────────────────────────────
function VisualMap({ zones, onSelect }) {
  const maxX = Math.max(...zones.map(z => (z.map_x || 0) + (z.map_w || 2)), 8);
  const maxY = Math.max(...zones.map(z => (z.map_y || 0) + (z.map_h || 2)), 6);

  const cells = Array.from({ length: maxY }, (_, y) =>
    Array.from({ length: maxX }, (_, x) => {
      return zones.find(z =>
        x >= (z.map_x||0) && x < (z.map_x||0)+(z.map_w||2) &&
        y >= (z.map_y||0) && y < (z.map_y||0)+(z.map_h||2) &&
        x === (z.map_x||0) && y === (z.map_y||0)
      ) || null;
    })
  );

  return (
    <div className="zone-map overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxX}, minmax(70px,1fr))`, gap: 8 }}>
        {cells.flat().map((zone, i) => {
          if (!zone) {
            return (
              <div key={i}
                style={{ gridColumn: `span 1`, gridRow: `span 1` }}
                className="rounded-xl border-2 border-dashed border-gray-200 min-h-[70px] flex items-center justify-center">
                <span className="text-gray-300 text-xs">ว่าง</span>
              </div>
            );
          }
          const zt   = ZONE_TYPE_MAP[zone.zone_type] || {};
          const Icon = zt.icon || Leaf;
          return (
            <div key={zone.zone_id}
              style={{
                gridColumn: `span ${zone.map_w || 2}`,
                gridRow: `span ${zone.map_h || 2}`,
              }}
              className={`zone-cell ${STATUS_CELL_CLS[zone.status] || 'zone-vacant'}`}
              onClick={() => onSelect(zone)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: zt.color }}>{zone.zone_code}</span>
                <Icon size={14} style={{ color: zt.color }} />
              </div>
              <div className="text-xs font-medium text-gray-700 truncate mt-1">{zone.zone_name}</div>
              {zone.crop_name && (
                <div className="text-xs text-gray-500 truncate">{zone.crop_name}</div>
              )}
              <div className="mt-auto">
                <span className={`badge ${STATUS_MAP[zone.status]?.cls || 'badge-vacant'}`} style={{ fontSize: '0.65rem' }}>
                  {STATUS_MAP[zone.status]?.label || zone.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Zone Detail Drawer ─────────────────────────────────────
function ZoneDetail({ zone, onClose, onEdit, onDelete }) {
  if (!zone) return null;
  const zt   = ZONE_TYPE_MAP[zone.zone_type] || {};
  const Icon = zt.icon || Leaf;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col fade-in border-l border-gray-100">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: zt.color + '20' }}>
            <Icon size={18} style={{ color: zt.color }} />
          </div>
          <div>
            <div className="font-bold text-gray-800">{zone.zone_code}</div>
            <div className="text-xs text-gray-400">{zt.label}</div>
          </div>
        </div>
        <button className="btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="text-sm font-semibold text-gray-800">{zone.zone_name}</div>
          <span className={`badge ${STATUS_MAP[zone.status]?.cls || 'badge-vacant'} mt-1`}>
            {STATUS_MAP[zone.status]?.label}
          </span>
        </div>
        {zone.area_sqm && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">พื้นที่</span>
            <span className="font-medium">{zone.area_sqm} ตร.ม.</span>
          </div>
        )}
        {zone.crop_name && (
          <div className="p-3 bg-farm-50 rounded-xl border border-farm-100">
            <div className="text-xs font-semibold text-farm-600 mb-1">รอบการปลูกปัจจุบัน</div>
            <div className="text-sm font-bold text-gray-800">{zone.crop_name}</div>
            <div className="text-xs text-gray-500">Lot: {zone.lot_number}</div>
            {zone.days_growing !== null && (
              <div className="text-xs text-gray-500">วันที่ปลูก: {zone.days_growing} วัน</div>
            )}
            {zone.expected_harvest_date && (
              <div className="text-xs text-gray-500">
                เก็บเกี่ยว: {new Date(zone.expected_harvest_date).toLocaleDateString('th-TH')}
              </div>
            )}
          </div>
        )}
        {/* Type-specific metrics */}
        {zone.zone_type === 'hydroponics' && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'EC', val: zone.ec_level, unit: 'mS/cm', color: '#7c3aed' },
              { label: 'pH', val: zone.ph_level, unit: '',       color: '#0284c7' },
              { label: 'รอบน้ำ', val: zone.water_cycle_minutes, unit: 'นาที', color: '#16a34a' },
            ].map(({ label, val, unit, color }) => (
              <div key={label} className="text-center p-2 rounded-xl border" style={{ borderColor: color + '30', background: color + '08' }}>
                <div className="text-sm font-bold" style={{ color }}>{val ?? '-'}</div>
                <div className="text-xs text-gray-400">{label}</div>
                {unit && <div className="text-xs text-gray-300">{unit}</div>}
              </div>
            ))}
          </div>
        )}
        {zone.zone_type === 'soil_bed' && zone.soil_moisture_pct && (
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">ความชื้นดิน</span>
              <span className="font-bold text-green-600">{zone.soil_moisture_pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${zone.soil_moisture_pct}%`,
                background: zone.soil_moisture_pct < 40 ? '#ef4444' : '#52b788' }} />
            </div>
            {zone.soil_moisture_pct < 40 && (
              <div className="text-xs text-red-500 mt-1">⚠️ ดินแห้ง — ควรรดน้ำ</div>
            )}
          </div>
        )}
        {zone.notes && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 border">
            {zone.notes}
          </div>
        )}
      </div>
      <div className="p-4 border-t flex gap-2">
        <button className="btn btn-outline flex-1 btn-sm" onClick={onEdit}>
          <Edit2 size={13} /> แก้ไข
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function ZoneManagement() {
  const { notifySuccess, notifyError } = useFarm();
  const [zones,    setZones]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('map');      // 'map' | 'list'
  const [modal,    setModal]    = useState(null);       // null | 'add' | zone object
  const [selected, setSelected] = useState(null);       // zone for detail drawer
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchZones();
      setZones(res.data);
    } catch (e) {
      notifyError(e.message);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    try {
      if (modal?.zone_id) {
        await updateZone(modal.zone_id, form);
        notifySuccess('อัปเดตโซนเรียบร้อย');
      } else {
        await createZone(form);
        notifySuccess('เพิ่มโซนใหม่เรียบร้อย');
      }
      setModal(null);
      load();
    } catch (e) {
      notifyError(e.message);
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`ลบโซน ${zone.zone_code} ใช่ไหม?`)) return;
    try {
      await deleteZone(zone.zone_id);
      notifySuccess('ลบโซนเรียบร้อย');
      setSelected(null);
      load();
    } catch (e) {
      notifyError(e.message);
    }
  };

  const filtered = filter === 'all' ? zones : zones.filter(z => z.status === filter);

  return (
    <>
      <Header title="พื้นที่ปลูก" subtitle="Zone & Resource Management" onRefresh={load} loading={loading}>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
          <Plus size={15} /> เพิ่มโซน
        </button>
      </Header>

      <div className="page-body fade-in">
        {/* Filter + View Toggle */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', ...STATUS_LIST.map(s => s.value)].map(v => (
              <button key={v}
                onClick={() => setFilter(v)}
                className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-ghost'}`}
              >
                {v === 'all' ? `ทั้งหมด (${zones.length})` : STATUS_MAP[v]?.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('map')}
              className={`btn btn-sm ${view === 'map' ? 'btn-primary' : 'btn-ghost border-0'}`}>
              <Map size={14} /> แผนที่
            </button>
            <button onClick={() => setView('list')}
              className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost border-0'}`}>
              <List size={14} /> รายการ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : view === 'map' ? (
          <div className="card">
            <div className="card-title"><Map size={15} /> แผนผังฟาร์ม</div>
            <VisualMap zones={filtered} onSelect={setSelected} />
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {STATUS_LIST.map(s => (
                <div key={s.value} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`badge ${s.cls}`} style={{ fontSize: '0.7rem' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>รหัส</th><th>ชื่อโซน</th><th>ประเภท</th>
                  <th>สถานะ</th><th>พืชปัจจุบัน</th>
                  <th>EC/ความชื้น</th><th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(z => {
                  const zt = ZONE_TYPE_MAP[z.zone_type] || {};
                  const Icon = zt.icon || Leaf;
                  return (
                    <tr key={z.zone_id}>
                      <td className="font-bold text-farm-700">{z.zone_code}</td>
                      <td>{z.zone_name}</td>
                      <td>
                        <span className="flex items-center gap-1.5 text-sm">
                          <Icon size={14} style={{ color: zt.color }} />
                          {zt.label}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_MAP[z.status]?.cls || 'badge-vacant'}`}>
                          {STATUS_MAP[z.status]?.label}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{z.crop_name || '—'}</td>
                      <td className="text-sm">
                        {z.zone_type === 'hydroponics'
                          ? <span className="text-purple-600">EC {z.ec_level ?? '-'} / pH {z.ph_level ?? '-'}</span>
                          : z.zone_type === 'soil_bed'
                            ? <span className="text-green-600">{z.soil_moisture_pct ?? '-'}%</span>
                            : '—'
                        }
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="btn-icon btn-sm" onClick={() => setSelected(z)} title="ดูรายละเอียด">
                            <Eye size={13} />
                          </button>
                          <button className="btn-icon btn-sm" onClick={() => setModal(z)} title="แก้ไข">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn-icon btn-sm text-red-400 hover:text-red-600"
                            onClick={() => handleDelete(z)} title="ลบ">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-400">ไม่พบโซนที่ตรงกับตัวกรอง</div>
            )}
          </div>
        )}
      </div>

      {/* Zone Detail Drawer */}
      {selected && (
        <ZoneDetail
          zone={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setModal(selected); setSelected(null); }}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <ZoneModal
          zone={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
