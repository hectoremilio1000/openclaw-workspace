const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: process.env.GS_HEALTHCHECK_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  if (!process.env.GS_HEALTHCHECK_DB_URL) {
    console.log("POSTGRES|ERROR|Missing GS_HEALTHCHECK_DB_URL env var");
    process.exit(1);
  }

  try {
    await client.connect();
    const sql = "SELECT count(*)::text AS count FROM orders WHERE created_at > now() - interval '24 hours'";
    const res = await client.query(sql);
    console.log(`POSTGRES|OK|${res.rows[0].count}`);
  } catch (err) {
    console.log(`POSTGRES|ERROR|${String((err && err.message) || err)}`);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch {}
  }
})();
