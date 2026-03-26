import React, { useState, useEffect, useCallback } from 'react';
import {
  Sprout, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  Calendar, Package, CheckCircle, X, Save, Leaf,
  ArrowRight, Clock, BarChart3,
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import Header from '../components/Layout/Header';
import {
  fetchCrops, createCrop, updateCrop, deleteCrop,
  fetchBatches, createBatch, harvestBatch, cancelBatch,
  fetchZones,
} from '../services/api';
import { useFarm } from '../context/FarmContext';

// ── Helpers ────────────────────────────────────────────────
const TASK_TYPES = [
  { value: 'sow',        label: '🌱 เพาะเมล็ด' },
  { value: 'transplant', label: '🪴 ย้ายกล้า' },
  { value: 'water',      label: '💧 รดน้ำ' },
  { value: 'fertilize',  label: '🧪 ใส่ปุ๋ย' },
  { value: 'harvest',    label: '🌾 เก็บเกี่ยว' },
  { value: 'prune',      label: '✂️ ตัดแต่ง' },
  { value: 'check',      label: '🔍 ตรวจสอบ' },
  { value: 'general',    label: '📋 ทั่วไป' },
];
const BATCH_STATUS_MAP = {
  active:    { label: 'กำลังปลูก',    cls: 'badge-active' },
  harvested: { label: 'เก็บเกี่ยวแล้ว', cls: 'badge-harvested' },
  failed:    { label: 'ล้มเหลว',       cls: 'badge-maintenance' },
  cancelled: { label: 'ยกเลิก',        cls: 'badge-cancelled' },
};
const ZONE_TYPE_MAP = { hydroponics: 'ไฮโดร', soil_bed: 'แปลงดิน', perennial_tree: 'ยืนต้น' };

// ── Crop Template Form Modal ───────────────────────────────
function CropModal({ crop, onClose, onSave }) {
  const [form, setForm]     = useState(crop || {
    template_name: '', crop_category: 'vegetable',
    total_days: '', zone_type: 'any', description: '', color_tag: '#52b788',
    stages: [],
  });
  const [saving, setSaving] = useState(false);

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setS = (i, k, v) => setForm(p => ({
    ...p,
    stages: p.stages.map((s, idx) => idx === i ? { ...s, [k]: v } : s),
  }));
  const addStage = () => setForm(p => ({
    ...p,
    stages: [...p.stages, { stage_name: '', day_start: 1, day_end: 1, task_title: '', task_type: 'general' }],
  }));
  const removeStage = (i) => setForm(p => ({ ...p, stages: p.stages.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">
            {crop ? 'แก้ไขสูตรการปลูก' : 'เพิ่มสูตรการปลูกใหม่'}
          </h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="form-group mb-0">
                <label className="form-label">ชื่อพืช/สูตร *</label>
                <input className="form-input" value={form.template_name}
                  onChange={e => set('template_name', e.target.value)} required placeholder="เช่น กรีนโอ๊ค" />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">หมวดหมู่</label>
                <select className="form-select" value={form.crop_category}
                  onChange={e => set('crop_category', e.target.value)}>
                  {['vegetable','fruit','herb','tree','flower'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="form-group mb-0">
                <label className="form-label">ระยะเวลารวม (วัน) *</label>
                <input className="form-input" type="number" min="1"
                  value={form.total_days} onChange={e => set('total_days', e.target.value)} required />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">เหมาะกับโซน</label>
                <select className="form-select" value={form.zone_type}
                  onChange={e => set('zone_type', e.target.value)}>
                  <option value="any">ทุกประเภท</option>
                  <option value="hydroponics">ไฮโดรโปนิกส์</option>
                  <option value="soil_bed">แปลงดิน</option>
                  <option value="perennial_tree">ยืนต้น</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label">สีแสดงผล</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color_tag}
                    onChange={e => set('color_tag', e.target.value)}
                    className="w-10 h-9 rounded border p-0.5 cursor-pointer" />
                  <input className="form-input" value={form.color_tag}
                    onChange={e => set('color_tag', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="form-group mb-4">
              <label className="form-label">คำอธิบาย</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>

            {/* Stages */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-gray-700">ขั้นตอน / Stages</div>
              <button type="button" className="btn btn-success btn-sm" onClick={addStage}>
                <Plus size={13} /> เพิ่มขั้นตอน
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {form.stages.map((s, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="form-label">ชื่อขั้นตอน</label>
                      <input className="form-input" value={s.stage_name}
                        onChange={e => setS(i, 'stage_name', e.target.value)} placeholder="ระยะ..." />
                    </div>
                    <div>
                      <label className="form-label">วันที่ (เริ่ม–จบ)</label>
                      <div className="flex gap-1">
                        <input className="form-input" type="number" min="1" value={s.day_start}
                          onChange={e => setS(i, 'day_start', +e.target.value)} />
                        <input className="form-input" type="number" min="1" value={s.day_end}
                          onChange={e => setS(i, 'day_end', +e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">ประเภทงาน</label>
                      <select className="form-select" value={s.task_type}
                        onChange={e => setS(i, 'task_type', e.target.value)}>
                        {TASK_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="form-label">ชื่องาน (Task Title)</label>
                      <input className="form-input" value={s.task_title}
                        onChange={e => setS(i, 'task_title', e.target.value)} placeholder="สิ่งที่ต้องทำ..." />
                    </div>
                    <button type="button" className="btn btn-danger btn-sm mb-0"
                      onClick={() => removeStage(i)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {form.stages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4 border-2 border-dashed border-gray-200 rounded-xl">
                  ยังไม่มีขั้นตอน — กดเพิ่มขั้นตอนด้านบน
                </div>
              )}
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

// ── New Batch Modal ────────────────────────────────────────
function BatchModal({ zones, templates, onClose, onSave }) {
  const [form, setForm]     = useState({
    zone_id: '', template_id: '',
    start_date: new Date().toISOString().split('T')[0],
    quantity_planted: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedTemplate = templates.find(t => t.template_id === +form.template_id);
  const harvestDate = selectedTemplate && form.start_date
    ? format(addDays(new Date(form.start_date), selectedTemplate.total_days), 'd MMM yyyy', { locale: th })
    : '—';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">เริ่มรอบการปลูกใหม่</h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">สูตรการปลูก *</label>
              <select className="form-select" value={form.template_id}
                onChange={e => set('template_id', e.target.value)} required>
                <option value="">เลือกสูตรการปลูก</option>
                {templates.map(t => (
                  <option key={t.template_id} value={t.template_id}>
                    {t.template_name} ({t.total_days} วัน)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">โซนที่ปลูก *</label>
              <select className="form-select" value={form.zone_id}
                onChange={e => set('zone_id', e.target.value)} required>
                <option value="">เลือกโซน</option>
                {zones.filter(z => z.status === 'vacant' || z.status === 'preparing').map(z => (
                  <option key={z.zone_id} value={z.zone_id}>
                    {z.zone_code} — {z.zone_name} ({ZONE_TYPE_MAP[z.zone_type]})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">วันที่เริ่มปลูก *</label>
                <input className="form-input" type="date" value={form.start_date}
                  onChange={e => set('start_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">จำนวนที่ปลูก</label>
                <input className="form-input" type="number" value={form.quantity_planted}
                  onChange={e => set('quantity_planted', e.target.value)} placeholder="เช่น 200 ต้น" />
              </div>
            </div>
            {selectedTemplate && (
              <div className="p-3 bg-farm-50 rounded-xl border border-farm-100 mb-3 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-lg shadow"
                  style={{ background: selectedTemplate.color_tag || '#52b788' }}
                >
                  🌱
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">{selectedTemplate.template_name}</div>
                  <div className="text-xs text-gray-500">
                    {selectedTemplate.total_days} วัน · เก็บเกี่ยว: {harvestDate}
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
              <Sprout size={15} />
              {saving ? 'กำลังบันทึก...' : 'เริ่มปลูก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Harvest Modal ──────────────────────────────────────────
function HarvestModal({ batch, onClose, onSave }) {
  const [form, setForm] = useState({ quantity_harvested: '', harvest_unit: 'kg', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(batch.batch_id, form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="text-base font-bold text-gray-800">บันทึกการเก็บเกี่ยว</h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="p-3 bg-green-50 rounded-xl mb-4 text-sm text-green-800">
              <strong>{batch.template_name}</strong> · {batch.zone_code} · {batch.lot_number}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">ปริมาณที่ได้</label>
                <input className="form-input" type="number" step="0.01"
                  value={form.quantity_harvested}
                  onChange={e => setForm(p => ({ ...p, quantity_harvested: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">หน่วย</label>
                <select className="form-select" value={form.harvest_unit}
                  onChange={e => setForm(p => ({ ...p, harvest_unit: e.target.value }))}>
                  {['kg','g','ต้น','กล่อง','ถุง'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">หมายเหตุ</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-success" disabled={saving}>
              <CheckCircle size={15} />
              {saving ? 'กำลังบันทึก...' : 'ยืนยันเก็บเกี่ยว'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────
function TemplateCard({ tpl, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card border-l-4" style={{ borderLeftColor: tpl.color_tag || '#52b788' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow"
          style={{ background: tpl.color_tag || '#52b788' }}>
          <Leaf size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-gray-800">{tpl.template_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {tpl.crop_category} · {tpl.total_days} วัน ·
                {tpl.zone_type !== 'any' ? ` ${ZONE_TYPE_MAP[tpl.zone_type] || tpl.zone_type}` : ' ทุกโซน'}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button className="btn-icon btn-sm" onClick={() => onEdit(tpl)}><Edit2 size={13} /></button>
              <button className="btn-icon btn-sm text-red-400 hover:text-red-600" onClick={() => onDelete(tpl)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {tpl.description && (
            <div className="text-xs text-gray-500 mt-1 truncate">{tpl.description}</div>
          )}

          {/* Stage timeline preview */}
          {tpl.stages?.length > 0 && (
            <>
              <button
                className="flex items-center gap-1 text-xs text-farm-600 mt-2 hover:text-farm-800"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {tpl.stages.length} ขั้นตอน
              </button>
              {expanded && (
                <div className="mt-3 space-y-1.5 fade-in">
                  {tpl.stages.map((s, i) => (
                    <div key={s.stage_id || i} className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-farm-100 text-farm-700 flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">{s.stage_name}</span>
                        <span className="text-gray-400 ml-1">วันที่ {s.day_start}–{s.day_end}</span>
                      </div>
                      <ArrowRight size={10} className="text-gray-300" />
                      <span className="text-gray-500 truncate max-w-[120px]">{s.task_title}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Batch Row ──────────────────────────────────────────────
function BatchRow({ batch, onHarvest, onCancel }) {
  const pct = batch.total_days
    ? Math.min(100, Math.round((batch.days_elapsed / batch.total_days) * 100))
    : 0;
  const info = BATCH_STATUS_MAP[batch.status] || { label: batch.status, cls: 'badge-vacant' };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 text-lg shadow"
          style={{ background: batch.color_tag || '#52b788' }}>
          🌿
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="font-bold text-gray-800">{batch.template_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {batch.lot_number} · {batch.zone_code} — {batch.zone_name}
              </div>
            </div>
            <span className={`badge ${info.cls}`}>{info.label}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div>
              <div className="text-sm font-bold text-farm-700">{batch.days_elapsed ?? 0}</div>
              <div className="text-xs text-gray-400">วันที่ผ่านมา</div>
            </div>
            <div>
              <div className={`text-sm font-bold ${batch.days_to_harvest <= 3 ? 'text-red-500' : 'text-blue-600'}`}>
                {batch.days_to_harvest ?? '—'}
              </div>
              <div className="text-xs text-gray-400">วันก่อนเก็บ</div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-600">{batch.quantity_planted ?? '—'}</div>
              <div className="text-xs text-gray-400">ต้น/เมล็ด</div>
            </div>
          </div>

          {batch.status === 'active' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>ความคืบหน้า</span><span>{pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {batch.status === 'harvested' && batch.quantity_harvested && (
            <div className="mt-2 text-xs text-green-600 font-semibold">
              ✅ เก็บเกี่ยวได้ {batch.quantity_harvested} {batch.harvest_unit}
            </div>
          )}
        </div>
        {batch.status === 'active' && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button className="btn btn-success btn-sm" onClick={() => onHarvest(batch)}>
              <CheckCircle size={13} /> เก็บเกี่ยว
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onCancel(batch.batch_id)}>
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function CropPlanner() {
  const { notifySuccess, notifyError } = useFarm();
  const [templates, setTemplates] = useState([]);
  const [batches,   setBatches]   = useState([]);
  const [zones,     setZones]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('batches');  // 'batches' | 'templates'
  const [cropModal, setCropModal] = useState(null);
  const [batchModal,setBatchModal]= useState(false);
  const [harvestModal,setHarvestModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, ba, zo] = await Promise.all([fetchCrops(), fetchBatches(), fetchZones()]);
      setTemplates(cr.data);
      setBatches(ba.data);
      setZones(zo.data);
    } catch (e) {
      notifyError(e.message);
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => { load(); }, [load]);

  const handleSaveCrop = async (form) => {
    try {
      if (form.template_id) {
        await updateCrop(form.template_id, form);
        notifySuccess('อัปเดตสูตรการปลูกเรียบร้อย');
      } else {
        await createCrop(form);
        notifySuccess('เพิ่มสูตรการปลูกใหม่เรียบร้อย');
      }
      setCropModal(null); load();
    } catch (e) { notifyError(e.message); }
  };

  const handleDeleteCrop = async (tpl) => {
    if (!window.confirm(`ลบสูตร "${tpl.template_name}" ใช่ไหม?`)) return;
    try {
      await deleteCrop(tpl.template_id);
      notifySuccess('ลบสูตรเรียบร้อย');
      load();
    } catch (e) { notifyError(e.message); }
  };

  const handleSaveBatch = async (form) => {
    try {
      await createBatch(form);
      notifySuccess('เริ่มรอบการปลูกใหม่เรียบร้อย ระบบสร้างภารกิจให้อัตโนมัติ');
      setBatchModal(false); load();
    } catch (e) { notifyError(e.message); }
  };

  const handleHarvest = async (batchId, form) => {
    try {
      await harvestBatch(batchId, form);
      notifySuccess('บันทึกการเก็บเกี่ยวเรียบร้อย!');
      setHarvestModal(null); load();
    } catch (e) { notifyError(e.message); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('ยืนยันยกเลิกรอบการปลูกนี้?')) return;
    try {
      await cancelBatch(id);
      notifySuccess('ยกเลิกรอบการปลูกแล้ว');
      load();
    } catch (e) { notifyError(e.message); }
  };

  const filteredBatches = statusFilter === 'all'
    ? batches
    : batches.filter(b => b.status === statusFilter);

  const activeBatches = batches.filter(b => b.status === 'active');

  return (
    <>
      <Header title="แผนการเพาะปลูก" subtitle="Crop Lifecycle Planner" onRefresh={load} loading={loading}>
        <button className="btn btn-success btn-sm" onClick={() => setBatchModal(true)}>
          <Sprout size={15} /> เริ่มปลูกใหม่
        </button>
        {tab === 'templates' && (
          <button className="btn btn-primary btn-sm" onClick={() => setCropModal({})}>
            <Plus size={15} /> เพิ่มสูตร
          </button>
        )}
      </Header>

      <div className="page-body fade-in">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {[
            { icon: Sprout,      iconBg:'#16a34a', val: activeBatches.length,                    label:'รอบการปลูก' },
            { icon: BarChart3,   iconBg:'#0284c7', val: templates.length,                        label:'สูตรการปลูก' },
            { icon: Clock,       iconBg:'#f97316', val: batches.filter(b=>b.days_to_harvest<=7&&b.days_to_harvest>=0&&b.status==='active').length, label:'เก็บเกี่ยวใน 7 วัน' },
            { icon: CheckCircle, iconBg:'#7c3aed', val: batches.filter(b=>b.status==='harvested').length, label:'เสร็จแล้วทั้งหมด' },
          ].map(({ icon: Icon, iconBg, val, label }) => (
            <div key={label} className="stat-card">
              <div className="stat-icon" style={{ background: iconBg }}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <div className="stat-value">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { key:'batches',   label:'รอบการปลูก', icon: Package },
            { key:'templates', label:'สูตรการปลูก', icon: Leaf },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost border-0'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Batches Tab ─────────────────────────────── */}
        {tab === 'batches' && (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {['active','harvested','cancelled','all'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>
                  {s === 'active' ? `กำลังปลูก (${activeBatches.length})`
                    : s === 'harvested' ? 'เก็บเกี่ยวแล้ว'
                    : s === 'cancelled' ? 'ยกเลิก'
                    : `ทั้งหมด (${batches.length})`}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="grid gap-4">
                {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="card text-center py-14">
                <div className="text-4xl mb-3">🌱</div>
                <div className="text-gray-500 font-medium">ยังไม่มีรอบการปลูก</div>
                <div className="text-gray-400 text-sm mb-4">กดปุ่ม "เริ่มปลูกใหม่" เพื่อเริ่มต้น</div>
                <button className="btn btn-success mx-auto" onClick={() => setBatchModal(true)}>
                  <Sprout size={15} /> เริ่มปลูกใหม่
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBatches.map(b => (
                  <BatchRow key={b.batch_id} batch={b}
                    onHarvest={(batch) => setHarvestModal(batch)}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Templates Tab ───────────────────────────── */}
        {tab === 'templates' && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : templates.length === 0 ? (
            <div className="card text-center py-14">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-gray-500 font-medium">ยังไม่มีสูตรการปลูก</div>
              <button className="btn btn-primary mt-4 mx-auto" onClick={() => setCropModal({})}>
                <Plus size={15} /> เพิ่มสูตรแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => (
                <TemplateCard key={t.template_id} tpl={t}
                  onEdit={setCropModal}
                  onDelete={handleDeleteCrop}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {cropModal  && <CropModal  crop={cropModal.template_id ? cropModal : null} onClose={() => setCropModal(null)} onSave={handleSaveCrop} />}
      {batchModal && <BatchModal zones={zones} templates={templates} onClose={() => setBatchModal(false)} onSave={handleSaveBatch} />}
      {harvestModal && <HarvestModal batch={harvestModal} onClose={() => setHarvestModal(null)} onSave={handleHarvest} />}
    </>
  );
}
