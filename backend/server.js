require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const cron    = require('node-cron');
const { pool } = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/zones',      require('./routes/zones'));
app.use('/api/crops',      require('./routes/crops'));
app.use('/api/batches',    require('./routes/batches'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/irrigation', require('./routes/irrigation'));
app.use('/api/sensors',    require('./routes/sensors'));
app.use('/api/dashboard',  require('./routes/dashboard'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ── CRON: จำลองค่าเซนเซอร์ทุก 5 นาที (demo) ─────────────────
cron.schedule('*/5 * * * *', async () => {
  try {
    const [zones] = await pool.execute(
      "SELECT zone_id FROM zones WHERE status IN ('growing','ready_harvest')"
    );
    for (const z of zones) {
      await pool.execute(`
        INSERT INTO sensorreadings (zone_id,parameter_type,value,unit) VALUES
        (?,  'temperature', ?, '°C'),
        (?,  'humidity',    ?, '%')
      `, [
        z.zone_id, +(28 + Math.random() * 6).toFixed(1),
        z.zone_id, +(60 + Math.random() * 20).toFixed(1),
      ]);
    }
  } catch (e) {
    console.error('[CRON] sensor sim error:', e.message);
  }
});

// ── Start ─────────────────────────────────────────────────────
pool.getConnection()
  .then(conn => {
    conn.release();
    app.listen(PORT, () =>
      console.log(`🌱 Smart Farm API → http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  });
