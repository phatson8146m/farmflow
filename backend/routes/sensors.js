const router = require('express').Router();
const { query } = require('../config/database');

// GET /api/sensors/latest
router.get('/latest', async (req, res) => {
  try {
    const rows = await query(`
      SELECT sr.zone_id, z.zone_code, z.zone_name,
             sr.parameter_type, sr.value, sr.unit, sr.recorded_at
      FROM SensorReadings sr
      JOIN Zones z ON sr.zone_id = z.zone_id
      WHERE sr.reading_id IN (
        SELECT MAX(reading_id)
        FROM SensorReadings
        GROUP BY zone_id, parameter_type
      )
      ORDER BY z.zone_code, sr.parameter_type
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sensors/:zoneId/history?param=temperature&hours=24
router.get('/:zoneId/history', async (req, res) => {
  const { param, hours = 24 } = req.query;
  try {
    const conditions = [
      'zone_id = ?',
      'recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)',
    ];
    const params = [req.params.zoneId, parseInt(hours)];
    if (param) { conditions.push('parameter_type = ?'); params.push(param); }

    const rows = await query(`
      SELECT parameter_type, value, unit, recorded_at
      FROM SensorReadings
      WHERE ${conditions.join(' AND ')}
      ORDER BY recorded_at
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sensors  (from IoT device)
router.post('/', async (req, res) => {
  const { zone_id, parameter_type, value, unit } = req.body;
  try {
    await query(
      'INSERT INTO SensorReadings (zone_id,parameter_type,value,unit) VALUES (?,?,?,?)',
      [zone_id, parameter_type, value, unit||null]
    );

    // Check automation rules
    const rules = await query(`
      SELECT r.*, d.device_id
      FROM AutomationRules r
      JOIN IrrigationDevices d ON r.device_id = d.device_id
      WHERE r.zone_id = ?
        AND r.sensor_parameter = ?
        AND r.is_enabled = 1
        AND (r.last_triggered IS NULL
             OR TIMESTAMPDIFF(MINUTE, r.last_triggered, NOW()) >= r.cooldown_minutes)
    `, [zone_id, parameter_type]);

    for (const rule of rules) {
      let triggered = false;
      const v = parseFloat(value), t = parseFloat(rule.threshold_value);
      if (rule.condition_operator === '<')  triggered = v <  t;
      if (rule.condition_operator === '<=') triggered = v <= t;
      if (rule.condition_operator === '>')  triggered = v >  t;
      if (rule.condition_operator === '>=') triggered = v >= t;

      if (triggered) {
        const newState = rule.action === 'turn_on' ? 'on' : 'off';
        await query(
          'UPDATE IrrigationDevices SET current_state=?, last_triggered=NOW() WHERE device_id=?',
          [newState, rule.device_id]
        );
        await query(
          'UPDATE AutomationRules SET last_triggered=NOW() WHERE rule_id=?',
          [rule.rule_id]
        );
      }
    }

    res.status(201).json({ success: true, message: 'Reading recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
