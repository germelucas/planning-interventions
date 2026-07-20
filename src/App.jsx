import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 48;
const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fullName = person => `${person.firstName} ${person.lastName}`;
const dateTime = (date, minutes) => `${dateKey(date)}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const timeInMinutes = value => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
const hideNativeDragPreview = event => {
  const transparent = document.createElement('canvas');
  transparent.width = 1; transparent.height = 1;
  event.dataTransfer.setDragImage(transparent, 0, 0);
};
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
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Le service API est indisponible (${response.status}).`);
  }
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
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dropPreview, setDropPreview] = useState(null);
  const suppressEditUntil = useRef(0);

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
    () => interventions.filter(item =>
      (!employeeFilter || item.employeeId === Number(employeeFilter))
      && (!clientFilter || item.clientId === Number(clientFilter))),
    [interventions, employeeFilter, clientFilter],
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
  const openNew = (date, start = '09:00') => {
    const startMinutes = timeInMinutes(`2000-01-01T${start}`);
    const endMinutes = Math.min(startMinutes + 60, END_HOUR * 60);
    setError('');
    setModal({ type: 'intervention', date: dateKey(date), start, end: `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}` });
  };
  const removeIntervention = async item => {
    if (!window.confirm('Supprimer cette intervention ?')) return;
    try {
      await api(`/api/interventions/${item.id}`, { method: 'DELETE' });
      setContextMenu(null);
      await load();
    } catch (err) { setError(err.message); }
  };
  const moveIntervention = async (item, day, startMinutes) => {
    const duration = timeInMinutes(item.endAt) - timeInMinutes(item.startAt);
    const nextStart = Math.min(Math.max(START_HOUR * 60, startMinutes), END_HOUR * 60 - duration);
    const startAt = dateTime(day, nextStart), endAt = dateTime(day, nextStart + duration);
    if (startAt === item.startAt && endAt === item.endAt) return;
    const previous = interventions;
    setInterventions(current => current.map(value => value.id === item.id ? { ...value, startAt, endAt } : value));
    try {
      await api(`/api/interventions/${item.id}`, { method: 'PATCH', body: JSON.stringify({ clientId: item.clientId, employeeId: item.employeeId, startAt, endAt }) });
      setError('');
    } catch (err) {
      setInterventions(previous);
      setError(`Déplacement impossible : ${err.message}`);
    }
  };
  const startResize = (item, edge, event) => {
    event.preventDefault(); event.stopPropagation();
    suppressEditUntil.current = Infinity;
    const pointerStart = event.clientY;
    const originalStart = timeInMinutes(item.startAt);
    const originalEnd = timeInMinutes(item.endAt);
    let nextStart = originalStart, nextEnd = originalEnd;
    const previous = interventions;
    const resize = moveEvent => {
      const delta = Math.round(((moveEvent.clientY - pointerStart) * 60 / HOUR_HEIGHT) / 15) * 15;
      if (edge === 'start') nextStart = Math.max(START_HOUR * 60, Math.min(originalEnd - 15, originalStart + delta));
      else nextEnd = Math.min(END_HOUR * 60, Math.max(originalStart + 15, originalEnd + delta));
      const startAt = `${item.startAt.slice(0, 10)}T${pad(Math.floor(nextStart / 60))}:${pad(nextStart % 60)}`;
      const endAt = `${item.endAt.slice(0, 10)}T${pad(Math.floor(nextEnd / 60))}:${pad(nextEnd % 60)}`;
      setInterventions(current => current.map(value => value.id === item.id ? { ...value, startAt, endAt } : value));
    };
    const finish = async () => {
      document.removeEventListener('pointermove', resize);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      document.body.classList.remove('resizing-event');
      suppressEditUntil.current = Date.now() + 350;
      if (nextStart === originalStart && nextEnd === originalEnd) return;
      const startAt = `${item.startAt.slice(0, 10)}T${pad(Math.floor(nextStart / 60))}:${pad(nextStart % 60)}`;
      const endAt = `${item.endAt.slice(0, 10)}T${pad(Math.floor(nextEnd / 60))}:${pad(nextEnd % 60)}`;
      try {
        await api(`/api/interventions/${item.id}`, { method: 'PATCH', body: JSON.stringify({ clientId: item.clientId, employeeId: item.employeeId, startAt, endAt }) });
        setError('');
      } catch (err) {
        setInterventions(previous);
        setError(`Redimensionnement impossible : ${err.message}`);
      }
    };
    document.body.classList.add('resizing-event');
    document.addEventListener('pointermove', resize);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  return <div className="shell" onClick={() => contextMenu && setContextMenu(null)}>
    <aside>
      <div className="brand"><span>✦</span><div>Maison & soin<small>Planning d'équipe</small></div></div>
      <button className="primary" onClick={() => openNew(new Date())}>＋ Nouvelle intervention</button>
      <button onClick={() => { setError(''); setModal({ type: 'client' }); }}>＋ Nouveau client</button>
      <button onClick={() => { setError(''); setModal({ type: 'employee' }); }}>＋ Nouvelle intervenante</button>
      <div className="filter-card"><p>FILTRES</p><label>Intervenante<select value={employeeFilter} onChange={event => setEmployeeFilter(event.target.value)}><option value="">Toute l'équipe</option>{employees.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label><label>Client<select value={clientFilter} onChange={event => setClientFilter(event.target.value)}><option value="">Tous les clients</option>{clients.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">ESPACE ADMINISTRATION</p><h1>Planning des interventions</h1><p className="muted">Organisez les journées de votre équipe.</p></div><div className="today">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></header>
      <section className="toolbar">
        <div className="week-nav"><button aria-label={`${periodName} précédent`} onClick={() => changePeriod(-1)}>← Précédent</button><button className="today-button" onClick={() => setCursor(new Date())}>Aujourd'hui</button><button aria-label={`${periodName} suivant`} onClick={() => changePeriod(1)}>Suivant →</button></div>
        <div className="week-title"><span>{view === 'week' ? `Semaine ${week.number} / ${week.year}` : view === 'day' ? cursor.toLocaleDateString('fr-FR', { weekday: 'long' }) : cursor.toLocaleDateString('fr-FR', { year: 'numeric' })}</span><strong>{view === 'week' ? weekLabel : view === 'day' ? cursor.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong></div>
        <div className="view-switch" aria-label="Mode d'affichage">{[['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']].map(([value, label]) => <button key={value} className={view === value ? 'active' : ''} onClick={() => setView(value)}>{label}</button>)}</div>
      </section>

      {error && !modal && <div className="planning-error" role="alert">{error}</div>}
      {view === 'month' ? <MonthView cursor={cursor} items={visible} onNew={openNew} onItemContext={(item, x, y) => setContextMenu({ type: 'intervention', item, x: Math.min(x, window.innerWidth - 230), y: Math.min(y, window.innerHeight - 110) })} onMove={moveIntervention} draggingId={draggingId} setDraggingId={setDraggingId} /> : <section className={`calendar ${view === 'day' ? 'day-view' : ''}`}>
        <div className="calendar-head"><div className="hours-corner">Heure</div>{(view === 'day' ? [cursor] : days).map(day => <div key={dateKey(day)} className={`calendar-day ${dateKey(day) === dateKey(new Date()) ? 'active' : ''}`}><span>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span><b>{day.getDate()}</b></div>)}</div>
        <div className="calendar-body">
          <div className="hours">{Array.from({ length: END_HOUR - START_HOUR - 1 }, (_, index) => <span key={index} style={{ top: (index + 1) * HOUR_HEIGHT }}>{pad(START_HOUR + index + 1)}:00</span>)}</div>
          {(view === 'day' ? [cursor] : days).map(day => <DayColumn key={dateKey(day)} day={day} items={visible.filter(item => item.startAt.slice(0, 10) === dateKey(day))} allItems={visible} onNew={start => openNew(day, start)} onContextRequest={(start, x, y) => setContextMenu({ type: 'create', day, start, x: Math.min(x, window.innerWidth - 230), y: Math.min(y, window.innerHeight - 110) })} onItemContext={(item, x, y) => setContextMenu({ type: 'intervention', item, x: Math.min(x, window.innerWidth - 230), y: Math.min(y, window.innerHeight - 110) })} onEdit={item => { if (Date.now() < suppressEditUntil.current) return; setError(''); setModal({ type: 'intervention', item, date: dateKey(day) }); }} onMove={moveIntervention} onResize={startResize} draggingId={draggingId} setDraggingId={setDraggingId} dropPreview={dropPreview} setDropPreview={setDropPreview} />)}
        </div>
      </section>}
    </main>
    {contextMenu && <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={event => event.stopPropagation()}>{contextMenu.type === 'create' ? <button onClick={() => { openNew(contextMenu.day, contextMenu.start); setContextMenu(null); }}><span>＋</span> Créer une intervention le {contextMenu.day.toLocaleDateString('fr-FR')} à {contextMenu.start}</button> : <><button onClick={() => { setError(''); setModal({ type: 'intervention', item: contextMenu.item, date: contextMenu.item.startAt.slice(0, 10) }); setContextMenu(null); }}><span>✎</span> Modifier l'intervention</button><button className="context-danger" onClick={() => removeIntervention(contextMenu.item)}><span>×</span> Supprimer l'intervention</button></>}</div>}
    {modal && <Modal modal={modal} clients={clients} employees={employees} error={error} setError={setError} close={() => setModal(null)} saved={async () => { setModal(null); await load(); }} />}
  </div>;
}

function MonthView({ cursor, items, onNew, onItemContext, onMove, draggingId, setDraggingId }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1), offset = (first.getDay() + 6) % 7;
  return <section className="month-calendar"><div className="month-weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => <span key={day}>{day}</span>)}</div><div className="month-grid">{Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - offset + 1), dateId = dateKey(date);
    const dayItems = items.filter(item => item.startAt.slice(0, 10) === dateId);
    return <div key={dateId} className={`${date.getMonth() === month ? '' : 'outside'} ${dateId === dateKey(new Date()) ? 'current' : ''} ${draggingId ? 'drop-ready' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const item = items.find(value => value.id === Number(event.dataTransfer.getData('text/plain'))); if (item) onMove(item, date, timeInMinutes(item.startAt)); setDraggingId(null); }} onDoubleClick={() => onNew(date)}><b className="month-number">{date.getDate()}</b>{dayItems.slice(0, 3).map(item => <button key={item.id} draggable className={`month-event color-${item.employeeId % 4} ${draggingId === item.id ? 'dragging' : ''}`} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); onItemContext(item, event.clientX, event.clientY); }} onDragStart={event => { event.dataTransfer.setData('text/plain', String(item.id)); event.dataTransfer.effectAllowed = 'move'; hideNativeDragPreview(event); setDraggingId(item.id); }} onDragEnd={() => setDraggingId(null)}><strong>{item.startAt.slice(11, 16)}</strong> {item.clientFirstName}</button>)}{dayItems.length > 3 && <small>+ {dayItems.length - 3} autres</small>}</div>;
  })}</div></section>;
}

function DayColumn({ day, items, allItems, onNew, onContextRequest, onItemContext, onEdit, onMove, onResize, draggingId, setDraggingId, dropPreview, setDropPreview }) {
  const dayId = dateKey(day);
  const preview = dropPreview?.day === dayId ? dropPreview : null;
  const previewItem = preview && allItems.find(item => item.id === preview.itemId);
  const previewDuration = previewItem ? timeInMinutes(previewItem.endAt) - timeInMinutes(previewItem.startAt) : 0;
  const previewTop = preview ? (preview.startMinutes - START_HOUR * 60) * HOUR_HEIGHT / 60 : 0;
  const previewHeight = Math.max(44, previewDuration * HOUR_HEIGHT / 60);
  const updatePreview = event => {
    event.preventDefault(); event.dataTransfer.dropEffect = 'move';
    const item = allItems.find(value => value.id === draggingId);
    if (!item) return;
    const duration = timeInMinutes(item.endAt) - timeInMinutes(item.startAt);
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = START_HOUR * 60 + (event.clientY - rect.top) * 60 / HOUR_HEIGHT;
    const startMinutes = Math.min(Math.max(START_HOUR * 60, Math.round(rawMinutes / 15) * 15), END_HOUR * 60 - duration);
    if (dropPreview?.day !== dayId || dropPreview.startMinutes !== startMinutes || dropPreview.itemId !== item.id) setDropPreview({ day: dayId, startMinutes, itemId: item.id });
  };
  const createFromRightClick = event => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes = START_HOUR * 60 + (event.clientY - rect.top) * 60 / HOUR_HEIGHT;
    const startMinutes = Math.min(Math.max(START_HOUR * 60, Math.round(rawMinutes / 15) * 15), (END_HOUR - 1) * 60);
    onContextRequest(`${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`, event.clientX, event.clientY);
  };
  return <div className={`day-column ${dayId === dateKey(new Date()) ? 'current' : ''} ${draggingId ? 'drop-ready' : ''}`} onContextMenu={createFromRightClick} onDragOver={updatePreview} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropPreview(null); }} onDrop={event => { event.preventDefault(); const item = allItems.find(value => value.id === Number(event.dataTransfer.getData('text/plain'))); if (item && preview) onMove(item, day, preview.startMinutes); setDraggingId(null); setDropPreview(null); }} onDoubleClick={() => onNew()}>
    {previewItem && <div className={`event drop-preview color-${previewItem.employeeId % 4}`} style={{ top: previewTop, height: previewHeight }}><b>{dateTime(day, preview.startMinutes).slice(11)} – {dateTime(day, preview.startMinutes + previewDuration).slice(11)}</b><span>{previewItem.clientFirstName} {previewItem.clientLastName}</span><small>Relâchez pour déposer</small></div>}
    {items.map(item => {
      const [startHour, startMinute] = item.startAt.slice(11, 16).split(':').map(Number);
      const [endHour, endMinute] = item.endAt.slice(11, 16).split(':').map(Number);
      const top = Math.max(0, ((startHour - START_HOUR) * 60 + startMinute) * HOUR_HEIGHT / 60);
      const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      const height = Math.max(44, duration * HOUR_HEIGHT / 60);
      return <button key={item.id} draggable className={`event color-${item.employeeId % 4} ${draggingId === item.id ? 'dragging' : ''}`} style={{ top, height }} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); onItemContext(item, event.clientX, event.clientY); }} onDragStart={event => { if (event.target.closest('.resize-handle')) { event.preventDefault(); return; } event.stopPropagation(); event.dataTransfer.setData('text/plain', String(item.id)); event.dataTransfer.effectAllowed = 'move'; hideNativeDragPreview(event); setDraggingId(item.id); }} onDragEnd={() => { setDraggingId(null); setDropPreview(null); }} onDoubleClick={event => event.stopPropagation()} title="Maintenez et déplacez pour changer le créneau">
        <i className="resize-handle resize-handle-top" onPointerDown={event => onResize(item, 'start', event)} title="Modifier l’heure de début" aria-label="Modifier l’heure de début" /><b>{item.startAt.slice(11, 16)} – {item.endAt.slice(11, 16)}</b><span>{item.clientFirstName} {item.clientLastName}</span><small>{item.employeeFirstName} {item.employeeLastName}</small><i className="resize-handle resize-handle-bottom" onPointerDown={event => onResize(item, 'end', event)} title="Modifier l’heure de fin" aria-label="Modifier l’heure de fin" />
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
    {isPerson ? <><label>Prénom<input name="firstName" required autoFocus /></label><label>Nom<input name="lastName" required /></label></> : <><label>Client<select name="clientId" defaultValue={item?.clientId}>{clients.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label><label>Intervenante<select name="employeeId" defaultValue={item?.employeeId}>{employees.map(person => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select></label><label>Date<input name="date" type="date" required defaultValue={item?.startAt.slice(0, 10) || modal.date} /></label><div className="row"><label>Début<input name="start" type="time" required defaultValue={item?.startAt.slice(11, 16) || modal.start || '09:00'} /></label><label>Fin<input name="end" type="time" required defaultValue={item?.endAt.slice(11, 16) || modal.end || '10:00'} /></label></div></>}
    <p className="error">{error}</p><div className="actions">{item && <button type="button" className="danger" onClick={remove}>Supprimer</button>}<button type="button" onClick={close}>Annuler</button><button className="primary">Enregistrer</button></div>
  </form></div>;
}
