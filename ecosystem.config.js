module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    // First application
    {
      name      : 'wechat4u',
      script    : './run-core.js',
      watch     : ['./run-core.js'],
      ignore_watch: ["node_modules"],
      watch_options: {
        "followSymlinks": false
      },
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
        NODE_ENV: 'production'
      }
    }
  ]
};
