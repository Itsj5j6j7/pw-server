module.exports = {
  apps: [
    {
      name: "propwash",
      script: "src/index.js",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: "300M",
    },
    {
      name: "propwash-api",
      script: "src/bridge/index.js",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: "200M",
    }
  ]
}
