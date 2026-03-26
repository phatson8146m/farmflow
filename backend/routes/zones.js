const router = require('express').Router();
const { query } = require('../config/database');

// GET /api/zones
router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        z.*,
        zd.ec_level, zd.ph_level, zd.water_cycle_minutes,
        zd.soil_moisture_pct, zd.last_tilled_date,
        zd.last_fertilized_date, zd.last_pruned_date,
        zd.fertilize_interval_days, zd.prune_interval_days,
        b.lot_number, b.batch_id,
        ct.template_name AS crop_name,
        b.expected_harvest_date,
        DATEDIFF(CURDATE(), b.start_date) AS days_growing
      FROM Zones z
      LEFT JOIN ZoneDetails   zd ON z.zone_id     = zd.zone_id
      LEFT JOIN Batches       b  ON b.zone_id     = z.zone_id AND b.status = 'active'
      LEFT JOIN CropTemplates ct ON b.template_id = ct.template_id
      ORDER BY z.zone_code
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/zones/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT z.*, zd.*
      FROM Zones z
      LEFT JOIN ZoneDetails zd ON z.zone_id = zd.zone_id
      WHERE z.zone_id = ?
    `, [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Zone not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/zones
router.post('/', async (req, res) => {
  const { zone_code, zone_name, zone_type, area_sqm, map_x, map_y, map_w, map_h, notes } = req.body;
  try {
    const result = await query(`
      INSERT INTO Zones (zone_code,zone_name,zone_type,area_sqm,map_x,map_y,map_w,map_h,notes)
      VALUES (?,?,?,?,?,?,?,?,?)
    `, [zone_code, zone_name, zone_type, area_sqm||null, map_x||0, map_y||0, map_w||2, map_h||2, notes||null]);

    const zoneId = result.insertId;
    await query('INSERT INTO ZoneDetails (zone_id) VALUES (?)', [zoneId]);
    res.status(201).json({ success: true, data: { zone_id: zoneId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/zones/:id
router.put('/:id', async (req, res) => {
  const {
    zone_name, status, area_sqm, map_x, map_y, map_w, map_h, notes,
    ec_level, ph_level, water_cycle_minutes,
    soil_moisture_pct, last_tilled_date,
    last_fertilized_date, last_pruned_date,
    fertilize_interval_days, prune_interval_days,
  } = req.body;
  const id = req.params.id;
  try {
    await query(`
      UPDATE Zones SET
        zone_name  = COALESCE(?, zone_name),
        status     = COALESCE(?, status),
        area_sqm   = COALESCE(?, area_sqm),
        map_x      = COALESCE(?, map_x),
        map_y      = COALESCE(?, map_y),
        map_w      = COALESCE(?, map_w),
        map_h      = COALESCE(?, map_h),
        notes      = COALESCE(?, notes),
        updated_at = NOW()
      WHERE zone_id = ?
    `, [zone_name||null, status||null, area_sqm||null,
        map_x??null, map_y??null, map_w??null, map_h??null,
        notes||null, id]);

    await query(`
      UPDATE ZoneDetails SET
        ec_level                = COALESCE(?, ec_level),
        ph_level                = COALESCE(?, ph_level),
        water_cycle_minutes     = COALESCE(?, water_cycle_minutes),
        soil_moisture_pct       = COALESCE(?, soil_moisture_pct),
        last_tilled_date        = COALESCE(?, last_tilled_date),
        last_fertilized_date    = COALESCE(?, last_fertilized_date),
        last_pruned_date        = COALESCE(?, last_pruned_date),
        fertilize_interval_days = COALESCE(?, fertilize_interval_days),
        prune_interval_days     = COALESCE(?, prune_interval_days),
        updated_at              = NOW()
      WHERE zone_id = ?
    `, [ec_level??null, ph_level??null, water_cycle_minutes??null,
        soil_moisture_pct??null, last_tilled_date||null,
        last_fertilized_date||null, last_pruned_date||null,
        fertilize_interval_days??null, prune_interval_days??null, id]);

    res.json({ success: true, message: 'Zone updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/zones/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM Zones WHERE zone_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Zone deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
