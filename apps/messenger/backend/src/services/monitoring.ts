import { Express } from 'express';
import prometheus from 'prom-client';
import mongoose from 'mongoose';
import { getRedisClient } from './redis';
import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/solvia/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: '/var/log/solvia/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

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

  interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      redis: 'healthy' | 'unhealthy' | 'unknown';
      mongodb: 'healthy' | 'disconnected' | 'unhealthy' | 'unknown';
      websocket: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    };
    version: string;
    uptime: number;
  }

  // Health check endpoint with detailed status
  app.get('/health', async (req, res) => {
    const status: HealthStatus = {
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
      logger.debug('Redis health check passed');
    } catch (error) {
      logger.error('Redis health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      status.services.redis = 'unhealthy';
      status.status = 'degraded';
    }

    // Check MongoDB
    try {
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        logger.warn('MongoDB not connected');
        status.services.mongodb = 'disconnected';
        status.status = 'degraded';
      } else if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        status.services.mongodb = 'healthy';
        logger.debug('MongoDB health check passed');
      } else {
        logger.warn('MongoDB connection exists but no database selected');
        status.services.mongodb = 'disconnected';
        status.status = 'degraded';
      }
    } catch (error) {
      logger.error('MongoDB health check failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionState: mongoose.connection?.readyState
      });
      status.services.mongodb = 'unhealthy';
      status.status = 'degraded';
    }

    // Check WebSocket connections
    try {
      const activeConnections = await wsConnectionsGauge.get();
      const connectionCount = activeConnections.values.length;
      status.services.websocket = connectionCount > 0 ? 'healthy' : 'degraded';
      
      if (status.services.websocket === 'degraded') {
        logger.warn('No active WebSocket connections');
        status.status = 'degraded';
      } else {
        logger.debug('WebSocket health check passed', { activeConnections: connectionCount });
      }
    } catch (error) {
      logger.error('WebSocket health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      status.services.websocket = 'unhealthy';
      status.status = 'degraded';
    }

    const httpStatus = status.status === 'healthy' ? 200 : 
                      status.status === 'degraded' ? 207 : 503;

    res.status(httpStatus).json(status);
  });
}

export { httpRequestDurationMicroseconds, wsConnectionsGauge };
