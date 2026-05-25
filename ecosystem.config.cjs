module.exports = {
  apps: [
    {
      name: "db-guard",
      script: ".output/server/index.mjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
