const http = require('http');
const { Client } = require('pg');

const PORT = Number(process.env.PORT || 3000);

async function getDbInfo() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'mydb',
  });

  await client.connect();
  const result = await client.query('SELECT NOW() as now');
  await client.end();

  return result.rows[0].now;
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/api/dbtime') {
    try {
      const now = await getDbInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ dbTime: now }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'bai03-backend',
    routes: ['/api/health', '/api/dbtime'],
  }));
});

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
