export const config = {
    server: {
        port: parseInt(process.env.SERVER_PORT || process.env.PORT || '3000'),
        host: process.env.SERVER_HOST || process.env.HOST || '0.0.0.0',
    },

    cache: {
        host:
            process.env.CACHE_SERVER_HOST ||
            process.env.REDISHOST ||
            process.env.REDIS_HOST ||
            'localhost',
        port: parseInt(
            process.env.CACHE_SERVER_PORT ||
                process.env.REDISPORT ||
                process.env.REDIS_PORT ||
                '6379'
        ),
        authToken:
            process.env.CACHE_AUTH_TOKEN ||
            process.env.REDISPASSWORD ||
            process.env.REDIS_PASSWORD ||
            undefined,
    },

    worker: {
        concurrencyLimit: parseInt(
            process.env.WORKER_CONCURRENCY_LIMIT || process.env.MAX_CONCURRENT_ORDERS || '10'
        ),
        retryAttemptLimit: parseInt(
            process.env.RETRY_ATTEMPT_LIMIT || process.env.MAX_RETRIES || '3'
        ),
        retryBackoffDuration: parseInt(
            process.env.RETRY_BACKOFF_DURATION || process.env.RETRY_DELAY_MS || '5000'
        ),
    },

    features: {
        useLiveTrading:
            process.env.USE_LIVE_TRADING === 'true' || process.env.ENABLE_REAL_EXECUTION === 'true',
        simulationLatency: parseInt(
            process.env.SIMULATION_LATENCY || process.env.MOCK_DELAY_MS || '200'
        ),
    },
};
