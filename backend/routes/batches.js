const router = require('express').Router();
const { pool, query } = require('../config/database');

// GET /api/batches
router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        b.*,
        z.zone_code, z.zone_name, z.zone_type,
        ct.template_name, ct.color_tag, ct.total_days,
        DATEDIFF(CURDATE(), b.start_date)              AS days_elapsed,
        DATEDIFF(b.expected_harvest_date, CURDATE())   AS days_to_harvest
      FROM Batches b
      LEFT JOIN Zones         z  ON b.zone_id     = z.zone_id
      LEFT JOIN CropTemplates ct ON b.template_id = ct.template_id
      ORDER BY b.start_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/batches/:id
router.get('/:id', async (req, res) => {
  try {
    const [batches, tasks] = await Promise.all([
      query(`
        SELECT b.*, z.zone_code, z.zone_name, ct.template_name, ct.color_tag, ct.total_days,
               DATEDIFF(CURDATE(), b.start_date)            AS days_elapsed,
               DATEDIFF(b.expected_harvest_date, CURDATE()) AS days_to_harvest
        FROM Batches b
        LEFT JOIN Zones z          ON b.zone_id     = z.zone_id
        LEFT JOIN CropTemplates ct ON b.template_id = ct.template_id
        WHERE b.batch_id = ?
      `, [req.params.id]),
      query('SELECT * FROM Tasks WHERE batch_id = ? ORDER BY due_date', [req.params.id]),
    ]);
    if (!batches.length)
      return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: { ...batches[0], tasks } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/batches
router.post('/', async (req, res) => {
  const { zone_id, template_id, start_date, quantity_planted, notes } = req.body;
  try {
    const tpl = await query('SELECT total_days FROM CropTemplates WHERE template_id = ?', [template_id]);
    const totalDays  = tpl[0]?.total_days || 0;
    const startD     = new Date(start_date);
    const harvestD   = new Date(startD);
    harvestD.setDate(harvestD.getDate() + totalDays);
    const harvestStr = harvestD.toISOString().split('T')[0];

    const lotNum = `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const result = await query(`
      INSERT INTO Batches
        (lot_number,zone_id,template_id,start_date,expected_harvest_date,quantity_planted,notes)
      VALUES (?,?,?,?,?,?,?)
    `, [lotNum, zone_id, template_id, start_date, harvestStr, quantity_planted||null, notes||null]);

    const batchId = result.insertId;

    // Update zone status
    await query("UPDATE Zones SET status='growing', updated_at=NOW() WHERE zone_id=?", [zone_id]);

    // Auto-generate tasks via stored procedure
    const conn = await pool.getConnection();
    try {
      await conn.execute('CALL sp_GenerateBatchTasks(?)', [batchId]);
    } finally {
      conn.release();
    }

    res.status(201).json({ success: true, data: { batch_id: batchId, lot_number: lotNum } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/batches/:id/harvest
router.put('/:id/harvest', async (req, res) => {
  const { quantity_harvested, harvest_unit, notes } = req.body;
  try {
    const batch = await query('SELECT zone_id FROM Batches WHERE batch_id=?', [req.params.id]);
    await query(`
      UPDATE Batches SET
        status              = 'harvested',
        actual_harvest_date = CURDATE(),
        quantity_harvested  = ?,
        harvest_unit        = ?,
        notes               = COALESCE(?, notes),
        updated_at          = NOW()
      WHERE batch_id = ?
    `, [quantity_harvested||null, harvest_unit||'kg', notes||null, req.params.id]);

    if (batch.length) {
      await query("UPDATE Zones SET status='vacant', updated_at=NOW() WHERE zone_id=?", [batch[0].zone_id]);
    }
    res.json({ success: true, message: 'Batch harvested' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/batches/:id  (cancel)
router.delete('/:id', async (req, res) => {
  try {
    await query("UPDATE Batches SET status='cancelled' WHERE batch_id=?", [req.params.id]);
    res.json({ success: true, message: 'Batch cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
