const router = require('express').Router();
const { query } = require('../config/database');

// GET /api/crops
router.get('/', async (req, res) => {
  try {
    const templates = await query('SELECT * FROM CropTemplates WHERE is_active = 1 ORDER BY template_name');
    const stages    = await query('SELECT * FROM CropStages ORDER BY template_id, stage_order');

    const stageMap = {};
    stages.forEach(s => {
      if (!stageMap[s.template_id]) stageMap[s.template_id] = [];
      stageMap[s.template_id].push(s);
    });
    const data = templates.map(t => ({ ...t, stages: stageMap[t.template_id] || [] }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/crops/:id
router.get('/:id', async (req, res) => {
  try {
    const [tpl, stages] = await Promise.all([
      query('SELECT * FROM CropTemplates WHERE template_id = ?', [req.params.id]),
      query('SELECT * FROM CropStages WHERE template_id = ? ORDER BY stage_order', [req.params.id]),
    ]);
    if (!tpl.length)
      return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: { ...tpl[0], stages } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/crops
router.post('/', async (req, res) => {
  const { template_name, crop_category, total_days, zone_type, description, color_tag, stages = [] } = req.body;
  try {
    const result = await query(`
      INSERT INTO CropTemplates (template_name,crop_category,total_days,zone_type,description,color_tag)
      VALUES (?,?,?,?,?,?)
    `, [template_name, crop_category||null, total_days, zone_type||'any', description||null, color_tag||'#52b788']);

    const templateId = result.insertId;
    for (const [i, s] of stages.entries()) {
      await query(`
        INSERT INTO CropStages
          (template_id,stage_order,stage_name,day_start,day_end,task_title,task_description,task_type)
        VALUES (?,?,?,?,?,?,?,?)
      `, [templateId, i+1, s.stage_name, s.day_start, s.day_end,
          s.task_title, s.task_description||null, s.task_type||'general']);
    }
    res.status(201).json({ success: true, data: { template_id: templateId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/crops/:id
router.put('/:id', async (req, res) => {
  const { template_name, crop_category, total_days, zone_type, description, color_tag, stages } = req.body;
  const id = req.params.id;
  try {
    await query(`
      UPDATE CropTemplates SET
        template_name = COALESCE(?, template_name),
        crop_category = COALESCE(?, crop_category),
        total_days    = COALESCE(?, total_days),
        zone_type     = COALESCE(?, zone_type),
        description   = COALESCE(?, description),
        color_tag     = COALESCE(?, color_tag)
      WHERE template_id = ?
    `, [template_name||null, crop_category||null, total_days||null,
        zone_type||null, description||null, color_tag||null, id]);

    if (stages) {
      await query('DELETE FROM CropStages WHERE template_id = ?', [id]);
      for (const [i, s] of stages.entries()) {
        await query(`
          INSERT INTO CropStages
            (template_id,stage_order,stage_name,day_start,day_end,task_title,task_description,task_type)
          VALUES (?,?,?,?,?,?,?,?)
        `, [id, i+1, s.stage_name, s.day_start, s.day_end,
            s.task_title, s.task_description||null, s.task_type||'general']);
      }
    }
    res.json({ success: true, message: 'Template updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/crops/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE CropTemplates SET is_active = 0 WHERE template_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Template archived' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
