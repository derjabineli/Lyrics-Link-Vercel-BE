const pg = require("pg");

// connect to Neon Database
const pool = new pg.Pool({
  ssl: {
    require: true,
  },
});

module.exports = pool;
