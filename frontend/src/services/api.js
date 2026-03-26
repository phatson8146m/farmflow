import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด';
    return Promise.reject(new Error(msg));
  }
);

// ── Dashboard ──────────────────────────────────────────────
export const fetchDashboardSummary = () => api.get('/dashboard/summary');

// ── Zones ──────────────────────────────────────────────────
export const fetchZones          = ()          => api.get('/zones');
export const fetchZone           = (id)        => api.get(`/zones/${id}`);
export const createZone          = (data)      => api.post('/zones', data);
export const updateZone          = (id, data)  => api.put(`/zones/${id}`, data);
export const deleteZone          = (id)        => api.delete(`/zones/${id}`);

// ── Crops (Templates) ──────────────────────────────────────
export const fetchCrops          = ()          => api.get('/crops');
export const fetchCrop           = (id)        => api.get(`/crops/${id}`);
export const createCrop          = (data)      => api.post('/crops', data);
export const updateCrop          = (id, data)  => api.put(`/crops/${id}`, data);
export const deleteCrop          = (id)        => api.delete(`/crops/${id}`);

// ── Batches ────────────────────────────────────────────────
export const fetchBatches        = ()          => api.get('/batches');
export const fetchBatch          = (id)        => api.get(`/batches/${id}`);
export const createBatch         = (data)      => api.post('/batches', data);
export const harvestBatch        = (id, data)  => api.put(`/batches/${id}/harvest`, data);
export const cancelBatch         = (id)        => api.delete(`/batches/${id}`);

// ── Tasks ──────────────────────────────────────────────────
export const fetchTasks          = (params)    => api.get('/tasks', { params });
export const fetchTodayTasks     = ()          => api.get('/tasks/today');
export const fetchUpcomingTasks  = (days = 7)  => api.get('/tasks/upcoming', { params: { days } });
export const createTask          = (data)      => api.post('/tasks', data);
export const updateTaskStatus    = (id, status)=> api.patch(`/tasks/${id}/status`, { status });

// ── Irrigation – Devices ───────────────────────────────────
export const fetchDevices        = ()          => api.get('/irrigation/devices');
export const createDevice        = (data)      => api.post('/irrigation/devices', data);
export const toggleDevice        = (id)        => api.patch(`/irrigation/devices/${id}/toggle`);
export const setDeviceState      = (id, state) => api.patch(`/irrigation/devices/${id}/state`, { state });
export const deleteDevice        = (id)        => api.delete(`/irrigation/devices/${id}`);

// ── Irrigation – Schedules ─────────────────────────────────
export const fetchSchedules      = ()          => api.get('/irrigation/schedules');
export const createSchedule      = (data)      => api.post('/irrigation/schedules', data);
export const updateSchedule      = (id, data)  => api.put(`/irrigation/schedules/${id}`, data);
export const toggleSchedule      = (id)        => api.patch(`/irrigation/schedules/${id}/toggle`);
export const deleteSchedule      = (id)        => api.delete(`/irrigation/schedules/${id}`);

// ── Irrigation – Automation Rules ──────────────────────────
export const fetchRules          = ()          => api.get('/irrigation/rules');
export const createRule          = (data)      => api.post('/irrigation/rules', data);
export const updateRule          = (id, data)  => api.put(`/irrigation/rules/${id}`, data);
export const toggleRule          = (id)        => api.patch(`/irrigation/rules/${id}/toggle`);
export const deleteRule          = (id)        => api.delete(`/irrigation/rules/${id}`);

// ── Sensors ────────────────────────────────────────────────
export const fetchLatestSensors  = ()                    => api.get('/sensors/latest');
export const fetchSensorHistory  = (zoneId, param, hours)=>
  api.get(`/sensors/${zoneId}/history`, { params: { param, hours } });
