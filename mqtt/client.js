const mqtt = require('mqtt');
const { getDb } = require('../models/db');

let mqttClient;

function connectMQTT() {
  const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: false,
  };
  mqttClient = mqtt.connect(process.env.MQTT_BROKER, options);

  mqttClient.on('connect', () => {
    console.log('MQTT connected');
    mqttClient.subscribe('dustbin/+/telemetry/fill');
    mqttClient.subscribe('dustbin/+/telemetry/moisture');
    mqttClient.subscribe('dustbin/+/telemetry/counts');
    mqttClient.subscribe('dustbin/+/telemetry/status');
  });

  mqttClient.on('message', async (topic, message) => {
    const parts = topic.split('/');
    if (parts.length !== 4) return;
    const deviceId = parts[1];
    const type = parts[3];
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch (e) {
      return;
    }

    const db = getDb();
    const timestamp = new Date().toISOString();

    if (type === 'fill') {
      await db.run('INSERT INTO telemetry_fill (device_id, fill, full, timestamp) VALUES (?, ?, ?, ?)',
        [deviceId, payload.fill, payload.full, timestamp]);
    } else if (type === 'moisture') {
      await db.run('INSERT INTO telemetry_moisture (device_id, raw, type, timestamp) VALUES (?, ?, ?, ?)',
        [deviceId, payload.raw, payload.type, timestamp]);
    } else if (type === 'counts') {
      await db.run('INSERT INTO telemetry_counts (device_id, wet, dry, total, timestamp) VALUES (?, ?, ?, ?, ?)',
        [deviceId, payload.wet, payload.dry, payload.total, timestamp]);
    } else if (type === 'status') {
      await db.run('INSERT INTO telemetry_status (device_id, lid, auto, locked, timestamp) VALUES (?, ?, ?, ?, ?)',
        [deviceId, payload.lid, payload.auto, payload.locked, timestamp]);
    }
  });

  return mqttClient;
}

function publishCommand(deviceId, command) {
  const topic = `dustbin/${deviceId}/control/action`;
  const payload = JSON.stringify({ command });
  mqttClient.publish(topic, payload);
}

module.exports = { connectMQTT, publishCommand };