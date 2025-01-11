import Redis from 'ioredis';

let redisClient: Redis.Redis;

export async function setupRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  redisClient.on('error', (error: Error) => {
    console.error('Redis connection error:', error);
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });

  return redisClient;
}

export function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}
