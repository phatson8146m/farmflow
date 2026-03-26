const router = require('express').Router();
const { query } = require('../config/database');

router.get('/summary', async (req, res) => {
  try {
    const [zoneStats, todayTasks, upcomingHarvests, sensorLatest, deviceStatus] =
      await Promise.all([
        query(`
          SELECT
            COUNT(*) AS total,
            SUM(status='growing')       AS growing,
            SUM(status='vacant')        AS vacant,
            SUM(status='ready_harvest') AS ready_harvest,
            SUM(status='preparing')     AS preparing,
            SUM(status='maintenance')   AS maintenance
          FROM Zones
        `),
        query(`
          SELECT
            COUNT(*) AS total,
            SUM(status='completed') AS completed,
            SUM(status='pending')   AS pending
          FROM Tasks
          WHERE due_date = CURDATE()
        `),
        query(`
          SELECT
            b.lot_number, b.expected_harvest_date,
            z.zone_code, z.zone_name,
            ct.template_name, ct.color_tag,
            DATEDIFF(b.expected_harvest_date, CURDATE()) AS days_left
          FROM Batches b
          JOIN Zones z          ON b.zone_id     = z.zone_id
          JOIN CropTemplates ct ON b.template_id = ct.template_id
          WHERE b.status = 'active'
            AND b.expected_harvest_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
          ORDER BY b.expected_harvest_date
          LIMIT 5
        `),
        query(`
          SELECT sr.zone_id, z.zone_code, z.zone_name,
                 sr.parameter_type, sr.value, sr.unit, sr.recorded_at
          FROM SensorReadings sr
          JOIN Zones z ON sr.zone_id = z.zone_id
          WHERE sr.reading_id IN (
            SELECT MAX(reading_id) FROM SensorReadings GROUP BY zone_id, parameter_type
          )
          ORDER BY z.zone_code, sr.parameter_type
        `),
        query(`
          SELECT
            COUNT(*) AS total,
            SUM(current_state='on') AS active,
            SUM(is_online=0)        AS offline
          FROM IrrigationDevices
        `),
      ]);

    res.json({
      success: true,
      data: {
        zoneStats:        zoneStats[0],
        taskStats:        todayTasks[0],
        upcomingHarvests: upcomingHarvests,
        sensorReadings:   sensorLatest,
        deviceStats:      deviceStatus[0],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
