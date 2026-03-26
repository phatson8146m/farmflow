const router = require('express').Router();
const { query } = require('../config/database');

// ── DEVICES ──────────────────────────────────────────────────

router.get('/devices', async (req, res) => {
  try {
    const rows = await query(`
      SELECT d.*, z.zone_code, z.zone_name
      FROM   IrrigationDevices d
      LEFT JOIN Zones z ON d.zone_id = z.zone_id
      ORDER BY z.zone_code, d.device_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/devices', async (req, res) => {
  const { zone_id, device_name, device_type, device_code } = req.body;
  try {
    const result = await query(`
      INSERT INTO IrrigationDevices (zone_id,device_name,device_type,device_code)
      VALUES (?,?,?,?)
    `, [zone_id||null, device_name, device_type, device_code||null]);
    res.status(201).json({ success: true, data: { device_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/devices/:id/toggle', async (req, res) => {
  try {
    const rows = await query('SELECT current_state FROM IrrigationDevices WHERE device_id=?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Device not found' });
    const newState = rows[0].current_state === 'on' ? 'off' : 'on';
    await query(`
      UPDATE IrrigationDevices SET current_state=?, last_triggered=NOW()
      WHERE device_id=?
    `, [newState, req.params.id]);
    res.json({ success: true, data: { device_id: +req.params.id, current_state: newState } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/devices/:id/state', async (req, res) => {
  const { state } = req.body;
  if (!['on','off'].includes(state))
    return res.status(400).json({ success: false, message: 'state must be on or off' });
  try {
    await query(`
      UPDATE IrrigationDevices SET current_state=?, last_triggered=NOW()
      WHERE device_id=?
    `, [state, req.params.id]);
    res.json({ success: true, data: { current_state: state } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/devices/:id', async (req, res) => {
  try {
    await query('DELETE FROM IrrigationDevices WHERE device_id=?', [req.params.id]);
    res.json({ success: true, message: 'Device deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SCHEDULES ─────────────────────────────────────────────────

router.get('/schedules', async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, d.device_name, d.device_type, z.zone_code, z.zone_name
      FROM   IrrigationSchedules s
      JOIN   IrrigationDevices   d ON s.device_id = d.device_id
      LEFT JOIN Zones            z ON d.zone_id   = z.zone_id
      ORDER BY s.trigger_time
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schedules', async (req, res) => {
  const { device_id, schedule_name, trigger_time, days_of_week, duration_minutes } = req.body;
  try {
    const result = await query(`
      INSERT INTO IrrigationSchedules
        (device_id,schedule_name,trigger_time,days_of_week,duration_minutes)
      VALUES (?,?,?,?,?)
    `, [device_id, schedule_name||null, trigger_time, days_of_week||'1111111', duration_minutes||10]);
    res.status(201).json({ success: true, data: { schedule_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/schedules/:id/toggle', async (req, res) => {
  try {
    await query(`
      UPDATE IrrigationSchedules
      SET is_enabled = IF(is_enabled=1, 0, 1)
      WHERE schedule_id=?
    `, [req.params.id]);
    res.json({ success: true, message: 'Schedule toggled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/schedules/:id', async (req, res) => {
  const { schedule_name, trigger_time, days_of_week, duration_minutes, is_enabled } = req.body;
  try {
    await query(`
      UPDATE IrrigationSchedules SET
        schedule_name    = COALESCE(?, schedule_name),
        trigger_time     = COALESCE(?, trigger_time),
        days_of_week     = COALESCE(?, days_of_week),
        duration_minutes = COALESCE(?, duration_minutes),
        is_enabled       = COALESCE(?, is_enabled)
      WHERE schedule_id=?
    `, [schedule_name||null, trigger_time||null, days_of_week||null,
        duration_minutes??null, is_enabled??null, req.params.id]);
    res.json({ success: true, message: 'Schedule updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    await query('DELETE FROM IrrigationSchedules WHERE schedule_id=?', [req.params.id]);
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── AUTOMATION RULES ──────────────────────────────────────────

router.get('/rules', async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.*, z.zone_code, z.zone_name, d.device_name, d.device_type
      FROM   AutomationRules    r
      LEFT JOIN Zones             z ON r.zone_id   = z.zone_id
      LEFT JOIN IrrigationDevices d ON r.device_id = d.device_id
      ORDER BY z.zone_code, r.rule_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rules', async (req, res) => {
  const {
    zone_id, device_id, rule_name, sensor_parameter,
    condition_operator, threshold_value, action,
    duration_minutes, cooldown_minutes,
  } = req.body;
  try {
    const result = await query(`
      INSERT INTO AutomationRules
        (zone_id,device_id,rule_name,sensor_parameter,condition_operator,
         threshold_value,action,duration_minutes,cooldown_minutes)
      VALUES (?,?,?,?,?,?,?,?,?)
    `, [zone_id, device_id, rule_name, sensor_parameter, condition_operator,
        threshold_value, action, duration_minutes||5, cooldown_minutes||30]);
    res.status(201).json({ success: true, data: { rule_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/rules/:id/toggle', async (req, res) => {
  try {
    await query(`
      UPDATE AutomationRules SET is_enabled = IF(is_enabled=1,0,1) WHERE rule_id=?
    `, [req.params.id]);
    res.json({ success: true, message: 'Rule toggled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/rules/:id', async (req, res) => {
  const {
    rule_name, sensor_parameter, condition_operator, threshold_value,
    action, duration_minutes, cooldown_minutes, is_enabled,
  } = req.body;
  try {
    await query(`
      UPDATE AutomationRules SET
        rule_name          = COALESCE(?, rule_name),
        sensor_parameter   = COALESCE(?, sensor_parameter),
        condition_operator = COALESCE(?, condition_operator),
        threshold_value    = COALESCE(?, threshold_value),
        action             = COALESCE(?, action),
        duration_minutes   = COALESCE(?, duration_minutes),
        cooldown_minutes   = COALESCE(?, cooldown_minutes),
        is_enabled         = COALESCE(?, is_enabled)
      WHERE rule_id=?
    `, [rule_name||null, sensor_parameter||null, condition_operator||null,
        threshold_value??null, action||null, duration_minutes??null,
        cooldown_minutes??null, is_enabled??null, req.params.id]);
    res.json({ success: true, message: 'Rule updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    await query('DELETE FROM AutomationRules WHERE rule_id=?', [req.params.id]);
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
