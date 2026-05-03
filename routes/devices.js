const express = require('express');
const { getDb } = require('../models/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const db = getDb();
  const devices = await db.all('SELECT * FROM devices WHERE user_id = ?', [req.userId]);
  res.json(devices);
});

router.post('/', async (req, res) => {
  const { device_id, name } = req.body;
  if (!device_id || !name) return res.status(400).json({ error: 'Missing device_id or name' });
  const db = getDb();
  try {
    await db.run('INSERT INTO devices (device_id, name, user_id) VALUES (?, ?, ?)',
      [device_id, name, req.userId]);
    res.status(201).json({ message: 'Device registered' });
  } catch (err) {
    res.status(400).json({ error: 'Device ID already exists' });
  }
});

router.delete('/:device_id', async (req, res) => {
  const db = getDb();
  const device = await db.get('SELECT * FROM devices WHERE device_id = ? AND user_id = ?',
    [req.params.device_id, req.userId]);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  await db.run('DELETE FROM devices WHERE device_id = ?', [req.params.device_id]);
  res.json({ message: 'Device deleted' });
});

module.exports = router;