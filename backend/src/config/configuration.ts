export default () => {
  let redisConfig: any = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: (process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io')) ? {} : undefined,
  };

  if (process.env.REDIS_URL) {
    const parsedUrl = new URL(process.env.REDIS_URL);
    redisConfig = {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port, 10) || 6379,
      password: parsedUrl.password || undefined,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
      url: process.env.DATABASE_URL,
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-me',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-me',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    redis: redisConfig,
  };
};
