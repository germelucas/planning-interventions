import { useCallback, useEffect, useMemo, useState } from 'react';

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 72;
const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fullName = person => `${person.firstName} ${person.lastName}`;
const mondayOf = date => {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};
const isoWeek = date => {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return { number: Math.ceil((((value - yearStart) / 86400000) + 1) / 7), year: value.getUTCFullYear() };
};

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

export default function App() {
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState('week');
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [newClients, newEmployees, newInterventions] = await Promise.all([
      api('/api/clients'), api('/api/employees'), api('/api/interventions'),
    ]);
    setClients(newClients); setEmployees(newEmployees); setInterventions(newInterventions);
  }, []);

  useEffect(() => { load().catch(err => setError(err.message)); }, [load]);

  const weekStart = mondayOf(cursor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart); day.setDate(day.getDate() + index); return day;
  });
  const visible = useMemo(
    () => interventions.filter(item => !filter || item.employeeId === Number(filter)),
    [interventions, filter],
  );
  const weekEnd = new Date(days[6]);
  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const week = isoWeek(cursor);
  const changePeriod = amount => setCursor(current => {
    const next = new Date(current);
    if (view === 'day') next.setDate(next.getDate() + amount);
    else if (view === 'week') next.setDate(next.getDate() + amount * 7);
    else next.setMonth(next.getMonth() + amount);
    return next;
  });
  const periodName = view === 'day' ? 'jour' : view === 'week' ? 'semaine' : 'mois';
  const openNew = date => { setError(''); setModal({ type: 'intervention', date: dateKey(date) }); };

  return <div className="shell">
    <aside>
      <div className="brand"><span>✦</span><div>Maison & soin<small>Planning d'équipe</small></div></div>
      <button className="primary" onClick={() => openNew(new Date())}>＋ Nouvelle intervention</button>
      <button onClick={() => { setError(''); setModal({ type: 'client' }); }}>＋ Nouveau client</button>
      <button onClick={() => { setError(''); setModal({ type: 'employee' }); }}>＋ Nouvelle intervenante</button>
      <div className="filter-card"><p>FILTRES</p><label>Intervenante<select value={filter} onChange={event => setFilter(event.target.value)}><option value="">Toute l'équipe</option>{employees.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">ESPACE ADMINISTRATION</p><h1>Planning des interventions</h1><p className="muted">Organisez les journées de votre équipe.</p></div><div className="today">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></header>
      <section className="toolbar">
        <div className="week-nav"><button aria-label={`${periodName} précédent`} onClick={() => changePeriod(-1)}>← Précédent</button><button className="today-button" onClick={() => setCursor(new Date())}>Aujourd'hui</button><button aria-label={`${periodName} suivant`} onClick={() => changePeriod(1)}>Suivant →</button></div>
        <div className="week-title"><span>{view === 'week' ? `Semaine ${week.number} / ${week.year}` : view === 'day' ? cursor.toLocaleDateString('fr-FR', { weekday: 'long' }) : cursor.toLocaleDateString('fr-FR', { year: 'numeric' })}</span><strong>{view === 'week' ? weekLabel : view === 'day' ? cursor.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong></div>
        <div className="view-switch" aria-label="Mode d'affichage">{[['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']].map(([value, label]) => <button key={value} className={view === value ? 'active' : ''} onClick={() => setView(value)}>{label}</button>)}</div>
      </section>

      {view === 'month' ? <MonthView cursor={cursor} items={visible} onNew={openNew} onEdit={item => { setError(''); setModal({ type: 'intervention', item, date: item.startAt.slice(0, 10) }); }} /> : <section className={`calendar ${view === 'day' ? 'day-view' : ''}`}>
        <div className="calendar-head"><div className="hours-corner">Heure</div>{(view === 'day' ? [cursor] : days).map(day => <button key={dateKey(day)} className={dateKey(day) === dateKey(new Date()) ? 'active' : ''} onClick={() => openNew(day)}><span>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span><b>{day.getDate()}</b></button>)}</div>
        <div className="calendar-body">
          <div className="hours">{Array.from({ length: END_HOUR - START_HOUR - 1 }, (_, index) => <span key={index} style={{ top: (index + 1) * HOUR_HEIGHT }}>{pad(START_HOUR + index + 1)}:00</span>)}</div>
          {(view === 'day' ? [cursor] : days).map(day => <DayColumn key={dateKey(day)} day={day} items={visible.filter(item => item.startAt.slice(0, 10) === dateKey(day))} onNew={() => openNew(day)} onEdit={item => { setError(''); setModal({ type: 'intervention', item, date: dateKey(day) }); }} />)}
        </div>
      </section>}
    </main>
    {modal && <Modal modal={modal} clients={clients} employees={employees} error={error} setError={setError} close={() => setModal(null)} saved={async () => { setModal(null); await load(); }} />}
  </div>;
}

function MonthView({ cursor, items, onNew, onEdit }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1), offset = (first.getDay() + 6) % 7;
  return <section className="month-calendar"><div className="month-weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => <span key={day}>{day}</span>)}</div><div className="month-grid">{Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - offset + 1), dateId = dateKey(date);
    const dayItems = items.filter(item => item.startAt.slice(0, 10) === dateId);
    return <div key={dateId} className={`${date.getMonth() === month ? '' : 'outside'} ${dateId === dateKey(new Date()) ? 'current' : ''}`} onDoubleClick={() => onNew(date)}><b className="month-number">{date.getDate()}</b>{dayItems.slice(0, 3).map(item => <button key={item.id} className={`month-event color-${item.employeeId % 4}`} onClick={() => onEdit(item)}><strong>{item.startAt.slice(11, 16)}</strong> {item.clientFirstName}</button>)}{dayItems.length > 3 && <small>+ {dayItems.length - 3} autres</small>}</div>;
  })}</div></section>;
}

function DayColumn({ day, items, onNew, onEdit }) {
  return <div className={`day-column ${dateKey(day) === dateKey(new Date()) ? 'current' : ''}`} onDoubleClick={onNew}>
    {items.map(item => {
      const [startHour, startMinute] = item.startAt.slice(11, 16).split(':').map(Number);
      const [endHour, endMinute] = item.endAt.slice(11, 16).split(':').map(Number);
      const top = Math.max(0, ((startHour - START_HOUR) * 60 + startMinute) * HOUR_HEIGHT / 60);
      const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      const height = Math.max(44, duration * HOUR_HEIGHT / 60);
      return <button key={item.id} className={`event color-${item.employeeId % 4}`} style={{ top, height }} onDoubleClick={event => event.stopPropagation()} onClick={() => onEdit(item)}>
        <b>{item.startAt.slice(11, 16)} – {item.endAt.slice(11, 16)}</b><span>{item.clientFirstName} {item.clientLastName}</span><small>{item.employeeFirstName} {item.employeeLastName}</small>
      </button>;
    })}
  </div>;
}

function Modal({ modal, clients, employees, error, setError, close, saved }) {
  const item = modal.item;
  const isPerson = modal.type !== 'intervention';
  async function submit(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      if (isPerson) await api(`/api/${modal.type === 'client' ? 'clients' : 'employees'}`, { method: 'POST', body: JSON.stringify({ firstName: form.get('firstName'), lastName: form.get('lastName') }) });
      else await api(`/api/interventions${item ? `/${item.id}` : ''}`, { method: item ? 'PATCH' : 'POST', body: JSON.stringify({ clientId: Number(form.get('clientId')), employeeId: Number(form.get('employeeId')), startAt: `${form.get('date')}T${form.get('start')}`, endAt: `${form.get('date')}T${form.get('end')}` }) });
      await saved();
    } catch (err) { setError(err.message); }
  }
  async function remove() { if (window.confirm('Supprimer cette intervention ?')) { await api(`/api/interventions/${item.id}`, { method: 'DELETE' }); await saved(); } }
  return <div className="backdrop" onMouseDown={event => event.target === event.currentTarget && close()}><form onSubmit={submit}><button type="button" className="close" onClick={close}>×</button><h2>{modal.type === 'client' ? 'Nouveau client' : modal.type === 'employee' ? 'Nouvelle intervenante' : item ? "Modifier l'intervention" : 'Nouvelle intervention'}</h2>
    {isPerson ? <><label>Prénom<input name="firstName" required autoFocus /></label><label>Nom<input name="lastName" required /></label></> : <><label>Client<select name="clientId" defaultValue={item?.clientId}>{clients.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label><label>Intervenante<select name="employeeId" defaultValue={item?.employeeId}>{employees.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label><label>Date<input name="date" type="date" required defaultValue={item?.startAt.slice(0, 10) || modal.date} /></label><div className="row"><label>Début<input name="start" type="time" required defaultValue={item?.startAt.slice(11, 16) || '09:00'} /></label><label>Fin<input name="end" type="time" required defaultValue={item?.endAt.slice(11, 16) || '10:00'} /></label></div></>}
    <p className="error">{error}</p><div className="actions">{item && <button type="button" className="danger" onClick={remove}>Supprimer</button>}<button type="button" onClick={close}>Annuler</button><button className="primary">Enregistrer</button></div>
  </form></div>;
}
