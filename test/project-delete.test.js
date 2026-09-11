const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
const prisma = require('../src/config/prisma');
let writes = 0;
prisma.user.findUnique = async ({ where }) => ({ id: where.id, role: where.id === 2 ? 'admin' : 'investor' });
prisma.project.delete = async ({ where }) => {
  writes++;
  if (where.id === 2) throw Object.assign(new Error(), { code: 'P2003' });
  if (where.id === 3) throw Object.assign(new Error(), { code: 'P2025' });
  return { id: where.id };
};
const app = express();
app.use('/api/projects', require('../src/routes/project.routes'));
test('only admins delete projects; invalid IDs, payment references and missing projects are handled', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const send = (id, role) => fetch(`http://127.0.0.1:${server.address().port}/api/projects/${id}`, {
    method: 'DELETE', headers: role ? { Authorization: `Bearer ${jwt.sign({ id: role === 'admin' ? 2 : 1, role }, process.env.JWT_SECRET)}` } : {},
  });
  try {
    assert.equal((await send(1)).status, 401);
    assert.equal((await send(1, 'investor')).status, 403);
    for (const id of ['abc', '0', '-1', '1.5']) assert.equal((await send(id, 'admin')).status, 404);
    assert.equal(writes, 0);
    const result = await send(1, 'admin');
    assert.equal(result.status, 200);
    assert.equal((await result.json()).data.id, 1);
    const blocked = await send(2, 'admin');
    assert.equal(blocked.status, 409);
    assert.match((await blocked.json()).message, /donations or transactions/);
    assert.equal((await send(3, 'admin')).status, 404);
    assert.equal(writes, 3);
  } finally { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
});
