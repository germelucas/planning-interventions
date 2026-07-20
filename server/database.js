import Database from 'better-sqlite3';

const pad = value => String(value).padStart(2, '0');
const dateTime = (date, hour) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`;

function seedDemoData(db) {
  const empty = ['clients', 'employees', 'interventions'].every(table => db.prepare(`SELECT COUNT(*) count FROM ${table}`).get().count === 0);
  if (!empty) return;
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const day = offset => { const value = new Date(monday); value.setDate(value.getDate() + offset); return value; };
  db.transaction(() => {
    const addClient = db.prepare('INSERT INTO clients(firstName,lastName) VALUES(?,?)');
    for (const person of [['Camille', 'Martin'], ['Hugo', 'Bernard'], ['Sarah', 'Petit'], ['Louis', 'Dubois']]) addClient.run(...person);
    const addEmployee = db.prepare('INSERT INTO employees(firstName,lastName) VALUES(?,?)');
    for (const person of [['Léa', 'Dupont'], ['Emma', 'Roux'], ['Chloé', 'Moreau']]) addEmployee.run(...person);
    const addIntervention = db.prepare('INSERT INTO interventions(clientId,employeeId,startAt,endAt) VALUES(?,?,?,?)');
    addIntervention.run(1, 1, dateTime(day(0), 9), dateTime(day(0), 11));
    addIntervention.run(2, 2, dateTime(day(2), 10), dateTime(day(2), 12));
    addIntervention.run(3, 3, dateTime(day(4), 14), dateTime(day(4), 16));
  })();
}

export function openDatabase(filename = 'planning.db') {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.exec('CREATE TABLE IF NOT EXISTS clients(id INTEGER PRIMARY KEY AUTOINCREMENT,firstName TEXT NOT NULL,lastName TEXT NOT NULL);CREATE TABLE IF NOT EXISTS employees(id INTEGER PRIMARY KEY AUTOINCREMENT,firstName TEXT NOT NULL,lastName TEXT NOT NULL);CREATE TABLE IF NOT EXISTS interventions(id INTEGER PRIMARY KEY AUTOINCREMENT,clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,employeeId INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,startAt TEXT NOT NULL,endAt TEXT NOT NULL);');
  seedDemoData(db);
  return db;
}
