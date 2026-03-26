const router = require('express').Router();
const { query } = require('../config/database');

const BASE_SELECT = `
  SELECT
    t.*,
    z.zone_code, z.zone_name,
    b.lot_number,
    ct.template_name, ct.color_tag
  FROM Tasks t
  LEFT JOIN Zones         z  ON t.zone_id     = z.zone_id
  LEFT JOIN Batches       b  ON t.batch_id    = b.batch_id
  LEFT JOIN CropTemplates ct ON b.template_id = ct.template_id
`;

const ORDER_BY = `
  ORDER BY
    FIELD(t.priority,'urgent','high','normal','low'),
    t.due_date
`;

// GET /api/tasks?date=YYYY-MM-DD&status=pending
router.get('/', async (req, res) => {
  try {
    const { date, status } = req.query;
    const conditions = ['1=1'];
    const params     = [];
    if (date)   { conditions.push('t.due_date = ?');  params.push(date); }
    if (status) { conditions.push('t.status = ?');    params.push(status); }

    const rows = await query(`${BASE_SELECT} WHERE ${conditions.join(' AND ')} ${ORDER_BY}`, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/today
router.get('/today', async (req, res) => {
  try {
    const rows = await query(`
      ${BASE_SELECT}
      WHERE t.due_date = CURDATE()
        AND t.status IN ('pending','in_progress')
      ${ORDER_BY}
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/upcoming?days=7
router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const rows = await query(`
      ${BASE_SELECT}
      WHERE t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND t.status IN ('pending','in_progress')
      ORDER BY t.due_date, FIELD(t.priority,'urgent','high','normal','low')
    `, [days]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks  (manual)
router.post('/', async (req, res) => {
  const { zone_id, batch_id, title, description, due_date, priority, task_type } = req.body;
  try {
    const result = await query(`
      INSERT INTO Tasks (zone_id,batch_id,title,description,due_date,priority,task_type)
      VALUES (?,?,?,?,?,?,?)
    `, [zone_id||null, batch_id||null, title, description||null,
        due_date, priority||'normal', task_type||'general']);
    res.status(201).json({ success: true, data: { task_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['pending','in_progress','completed','skipped'].includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status' });
  try {
    await query(`
      UPDATE Tasks SET
        status       = ?,
        completed_at = IF(? = 'completed', NOW(), completed_at)
      WHERE task_id = ?
    `, [status, status, req.params.id]);
    res.json({ success: true, message: 'Task status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
