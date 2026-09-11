const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
const prisma = require('../src/config/prisma');
let writes = 0;
prisma.user.findUnique = async ({ where }) => ({ id: where.id, role: where.id === 2 ? 'admin' : 'investor' });
prisma.project.create = async ({ data }) => { writes++; return { id: 1, ...data }; };
const app = express();
app.use(express.json());
app.use('/api/projects', require('../src/routes/project.routes'));
test('project creation requires admin and validates payload before database write', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/projects`;
  const send = (role, body = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${jwt.sign({ id: role === 'admin' ? 2 : 1, role }, process.env.JWT_SECRET)}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await send()).status, 401);
    assert.equal((await send('investor')).status, 403);
    assert.equal((await send('admin')).status, 400);
    assert.equal(writes, 0);
    assert.equal((await send('admin', { namaProyek: 'Reef test', lokasi: 'Bali', aiStatus: 'verified', adminId: 99 })).status, 201);
    assert.equal(writes, 1);
  } finally { await new Promise((resolve) => server.close(resolve)); await prisma.$disconnect(); }
});
