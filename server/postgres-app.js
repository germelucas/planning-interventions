import express from 'express';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './database.js';

const wrap = fn => (request, response, next) => Promise.resolve(fn(request, response)).catch(next);
const person = body => {
  const firstName = String(body?.firstName ?? '').trim(), lastName = String(body?.lastName ?? '').trim();
  if (!firstName || !lastName) throw Error('Le prénom et le nom sont obligatoires.');
  return { firstName, lastName };
};
async function slot(body, db, id = null) {
  const clientId = Number(body.clientId), employeeId = Number(body.employeeId);
  const startAt = String(body.startAt ?? ''), endAt = String(body.endAt ?? '');
  const valid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (!Number.isInteger(clientId) || !Number.isInteger(employeeId)) throw Error("Le client et l'intervenante sont obligatoires.");
  if (!valid.test(startAt) || !valid.test(endAt)) throw Error('Les dates et heures sont invalides.');
  if (startAt >= endAt) throw Error("L'heure de fin doit être après l'heure de début.");
  if (!(await db.query('select id from clients where id=$1', [clientId])).rowCount) throw Error("Le client sélectionné n'existe pas.");
  if (!(await db.query('select id from employees where id=$1', [employeeId])).rowCount) throw Error("L'intervenante sélectionnée n'existe pas.");
  if ((await db.query('select id from interventions where employee_id=$1 and start_at<$2 and end_at>$3 and ($4::bigint is null or id<>$4)', [employeeId, endAt, startAt, id])).rowCount) throw Error('Cette intervenante a déjà une intervention sur ce créneau.');
  return { clientId, employeeId, startAt, endAt };
}

export function createApp({ database } = {}) {
  const db = database ?? openDatabase(), app = express();
  app.use(express.json());
  app.use((q, _r, next) => {
    if (q.path === '/api/handler' && typeof q.query.path === 'string' && q.query.path.startsWith('/api/')) q.url = q.query.path;
    next();
  });
  app.use((q, r, next) => {
    const requestId = q.get('X-Request-Id') || randomUUID(), startedAt = Date.now();
    r.set('X-Request-Id', requestId);
    r.on('finish', () => {
      if (q.method !== 'GET') console.info(JSON.stringify({ event: 'api_request', requestId, method: q.method, path: q.path, status: r.statusCode, durationMs: Date.now() - startedAt }));
    });
    next();
  });
  app.get('/api/clients', wrap(async (_q, r) => r.json((await db.query('select id,first_name as "firstName",last_name as "lastName" from clients order by last_name,first_name')).rows)));
  app.get('/api/employees', wrap(async (_q, r) => r.json((await db.query('select id,first_name as "firstName",last_name as "lastName" from employees order by last_name,first_name')).rows)));
  app.get('/api/interventions', wrap(async (_q, r) => r.json((await db.query('select i.id,i.client_id as "clientId",i.employee_id as "employeeId",i.start_at as "startAt",i.end_at as "endAt",c.first_name as "clientFirstName",c.last_name as "clientLastName",e.first_name as "employeeFirstName",e.last_name as "employeeLastName" from interventions i join clients c on c.id=i.client_id join employees e on e.id=i.employee_id order by i.start_at')).rows)));
  for (const [route, table] of [['/api/clients', 'clients'], ['/api/employees', 'employees']]) app.post(route, wrap(async (q, r) => {
    const v = person(q.body);
    const x = await db.query(`insert into ${table}(first_name,last_name) values($1,$2) returning id,first_name as "firstName",last_name as "lastName"`, [v.firstName, v.lastName]);
    r.status(201).json(x.rows[0]);
  }));
  app.post('/api/interventions', wrap(async (q, r) => {
    const v = await slot(q.body, db);
    const x = await db.query('insert into interventions(client_id,employee_id,start_at,end_at) values($1,$2,$3,$4) returning id,client_id as "clientId",employee_id as "employeeId",start_at as "startAt",end_at as "endAt"', [v.clientId, v.employeeId, v.startAt, v.endAt]);
    r.status(201).json(x.rows[0]);
  }));
  app.patch('/api/interventions/:id', wrap(async (q, r) => {
    const id = Number(q.params.id);
    if (!Number.isInteger(id)) return r.status(400).json({ error: 'Identifiant invalide.' });
    if (!(await db.query('select id from interventions where id=$1', [id])).rowCount) return r.status(404).json({ error: 'Intervention introuvable.' });
    const v = await slot(q.body, db, id);
    const x = await db.query('update interventions set client_id=$1,employee_id=$2,start_at=$3,end_at=$4 where id=$5 returning id,client_id as "clientId",employee_id as "employeeId",start_at as "startAt",end_at as "endAt"', [v.clientId, v.employeeId, v.startAt, v.endAt, id]);
    r.json(x.rows[0]);
  }));
  app.delete('/api/interventions/:id', wrap(async (q, r) => {
    const id = Number(q.params.id);
    if (!Number.isInteger(id)) return r.status(400).json({ error: 'Identifiant invalide.' });
    if (!(await db.query('delete from interventions where id=$1', [id])).rowCount) return r.status(404).json({ error: 'Intervention introuvable.' });
    r.json({ deleted: true });
  }));
  app.use('/api', (_q, r) => r.status(404).json({ error: 'Ressource introuvable.' }));
  app.use((error, _q, r, _next) => {
    const conflict = error?.code === '23P01';
    r.status(conflict ? 409 : 400).json({ error: conflict ? 'Cette intervenante a déjà une intervention sur ce créneau.' : error.message || 'Cette opération est impossible.' });
  });
  return app;
}
