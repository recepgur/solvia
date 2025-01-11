import { Express } from 'express';
import prometheus from 'prom-client';
import mongoose from 'mongoose';
import { getRedisClient } from './redis';
import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const Registry = prometheus.Registry;
const register = new Registry();

collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 5],
});

const wsConnectionsGauge = new prometheus.Gauge({
  name: 'ws_connections_total',
  help: 'Total number of active WebSocket connections',
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(wsConnectionsGauge);

export async function setupMonitoring(app: Express) {
  // Monitoring endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  // Health check endpoint with detailed status
  app.get('/health', async (req, res) => {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'unknown',
        mongodb: 'unknown',
        websocket: 'unknown'
      },
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime()
    };

    try {
      // Check Redis
      const redis = getRedisClient();
      await redis.ping();
      status.services.redis = 'healthy';
    } catch (error) {
      status.services.redis = 'unhealthy';
      status.status = 'degraded';
    }

    // Check MongoDB
    try {
      await mongoose.connection.db.admin().ping();
      status.services.mongodb = 'healthy';
    } catch (error) {
      status.services.mongodb = 'unhealthy';
      status.status = 'degraded';
    }

    // Check WebSocket connections
    try {
      const activeConnections = await wsConnectionsGauge.get();
      status.services.websocket = activeConnections.values.length > 0 ? 'healthy' : 'degraded';
    } catch (error) {
      status.services.websocket = 'unhealthy';
      status.status = 'degraded';
    }

    const httpStatus = status.status === 'healthy' ? 200 : 
                      status.status === 'degraded' ? 207 : 503;

    res.status(httpStatus).json(status);
  });
}

export { httpRequestDurationMicroseconds, wsConnectionsGauge };
