const redis = require("redis");

// Create Redis Client
const client = redis.createClient({
  socket: {
    host: "145.223.23.3", // Your VPS IP
    port: 6379, // Redis default port
  }
});

client.on("error", (err) => {
  console.error("❌ Redis Connection Error:", err);
});

// Connect to Redis
client.connect().then(() => console.log("✅ Connected to Redis"));

module.exports = client;
