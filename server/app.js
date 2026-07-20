import express from 'express';
import { openDatabase } from './database.js';

const person = body => {
  const firstName = String(body?.firstName ?? '').trim(), lastName = String(body?.lastName ?? '').trim();
  if (!firstName || !lastName) throw Error('Le prénom et le nom sont obligatoires.');
  return { firstName, lastName };
};

function intervention(body, db, id = null) {
  const clientId = Number(body.clientId), employeeId = Number(body.employeeId), startAt = String(body.startAt ?? ''), endAt = String(body.endAt ?? '');
  const valid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (!Number.isInteger(clientId) || !Number.isInteger(employeeId)) throw Error("Le client et l'intervenante sont obligatoires.");
  if (!valid.test(startAt) || !valid.test(endAt) || isNaN(Date.parse(startAt)) || isNaN(Date.parse(endAt))) throw Error('Les dates et heures sont invalides.');
  if (startAt >= endAt) throw Error("L'heure de fin doit être après l'heure de début.");
  if (!db.prepare('SELECT id FROM clients WHERE id=?').get(clientId)) throw Error("Le client sélectionné n'existe pas.");
  if (!db.prepare('SELECT id FROM employees WHERE id=?').get(employeeId)) throw Error("L'intervenante sélectionnée n'existe pas.");
  let query = 'SELECT id FROM interventions WHERE employeeId=? AND startAt<? AND endAt>?', params = [employeeId, endAt, startAt];
  if (id !== null) { query += ' AND id!=?'; params.push(id); }
  if (db.prepare(query).get(...params)) throw Error('Cette intervenante a déjà une intervention sur ce créneau.');
  return { clientId, employeeId, startAt, endAt };
}

const shiftWeeks = (value, weeks) => {
  const [date, time] = value.split('T'), day = new Date(`${date}T12:00:00`), pad = number => String(number).padStart(2, '0');
  day.setDate(day.getDate() + weeks * 7);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${time}`;
};

export function createApp({ database } = {}) {
  const db = database ?? openDatabase(process.env.DB_PATH ?? 'planning.db'), app = express();
  app.use(express.json());
  app.get('/api/clients', (_request, response) => response.json(db.prepare('SELECT * FROM clients ORDER BY lastName,firstName').all()));
  app.get('/api/employees', (_request, response) => response.json(db.prepare('SELECT * FROM employees ORDER BY lastName,firstName').all()));
  app.get('/api/interventions', (_request, response) => response.json(db.prepare('SELECT i.*,c.firstName clientFirstName,c.lastName clientLastName,e.firstName employeeFirstName,e.lastName employeeLastName FROM interventions i JOIN clients c ON c.id=i.clientId JOIN employees e ON e.id=i.employeeId ORDER BY i.startAt').all()));
  for (const [route, table] of [['/api/clients', 'clients'], ['/api/employees', 'employees']]) app.post(route, (request, response, next) => { try { const value = person(request.body), result = db.prepare(`INSERT INTO ${table}(firstName,lastName)VALUES(?,?)`).run(value.firstName, value.lastName); response.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(result.lastInsertRowid)); } catch (error) { next(error); } });
  app.post('/api/interventions', (request, response, next) => { try {
    const recurrenceCount = Number(request.body.recurrenceCount ?? 1);
    if (![1, 2, 3].includes(recurrenceCount)) throw Error('Le nombre de répétitions est invalide.');
    const created = db.transaction(() => Array.from({ length: recurrenceCount }, (_, index) => {
      const value = intervention({ ...request.body, startAt: shiftWeeks(request.body.startAt, index), endAt: shiftWeeks(request.body.endAt, index) }, db);
      const result = db.prepare('INSERT INTO interventions(clientId,employeeId,startAt,endAt)VALUES(?,?,?,?)').run(value.clientId, value.employeeId, value.startAt, value.endAt);
      return db.prepare('SELECT * FROM interventions WHERE id=?').get(result.lastInsertRowid);
    }))();
    response.status(201).json(created.length === 1 ? created[0] : created);
  } catch (error) { next(error); } });
  app.patch('/api/interventions/:id', (request, response, next) => { try { const id = Number(request.params.id); if (!Number.isInteger(id)) return response.status(400).json({ error: 'Identifiant invalide.' }); if (!db.prepare('SELECT id FROM interventions WHERE id=?').get(id)) return response.status(404).json({ error: 'Intervention introuvable.' }); const value = intervention(request.body, db, id); db.prepare('UPDATE interventions SET clientId=?,employeeId=?,startAt=?,endAt=? WHERE id=?').run(value.clientId, value.employeeId, value.startAt, value.endAt, id); response.json(db.prepare('SELECT * FROM interventions WHERE id=?').get(id)); } catch (error) { next(error); } });
  app.delete('/api/interventions/:id', (request, response) => { const id = Number(request.params.id); if (!Number.isInteger(id)) return response.status(400).json({ error: 'Identifiant invalide.' }); if (!db.prepare('DELETE FROM interventions WHERE id=?').run(id).changes) return response.status(404).json({ error: 'Intervention introuvable.' }); response.json({ deleted: true }); });
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Ressource introuvable.' }));
  app.use((error, _request, response, _next) => response.status(400).json({ error: error.message || 'Cette opération est impossible.' }));
  return app;
}
