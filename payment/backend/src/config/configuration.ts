// src/config/config.ts
export default () => {
  return Object.freeze({
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3001', 10),
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      name: process.env.DB_DATABASE || 'migs_payments',
      dialect: process.env.DB_DIALECT || 'postgres',
      logging: process.env.DB_LOGGING === 'true',
    },

    migs: {
      merchantId: process.env.MIGS_MERCHANT_ID,
      accessCode: process.env.MIGS_ACCESS_CODE,
      secureSecret: process.env.MIGS_SECURE_SECRET,
      gatewayUrl: process.env.MIGS_GATEWAY_URL,
      gatewayQueryUrl: process.env.MIGS_GATEWAY_QUERY_URL,
      currency: process.env.MIGS_CURRENCY || 'AED',
      returnUrl: process.env.MIGS_RETURN_URL,
    },

    security: {
      apiKey: process.env.API_KEY,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },

    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }
    
  });
};
