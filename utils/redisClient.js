const { createClient } = require('redis');

const redis = createClient();

redis.on('error', (err) => console.error('Redis connection error:', err));
redis.on('connect', () => console.log('Redis connected!'));

// Connect to Redis
(async () => {
    try {
        await redis.connect();
        console.log('Redis is ready.');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

module.exports = redis;
