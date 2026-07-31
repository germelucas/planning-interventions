import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Calendar from "./components/Calendar.jsx";
import PlanningModal from "./components/PlanningModal.jsx";
import { api } from "./services/api.js";
import { END_HOUR, HOUR_HEIGHT, START_HOUR } from "./utils/calendar.js";
import { dateKey, dateTime, fullName, isoWeek, mondayOf, pad, timeInMinutes } from "./utils/dates.js";
// --- Composant principal ---
export default function App() {
  // Données reçues depuis PostgreSQL par l'intermédiaire de l'API.
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [interventions, setInterventions] = useState([]);

  // État de navigation et filtres choisis par l'utilisateur.
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState("week");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  // État temporaire de l'interface : fenêtres, erreurs et glisser-déposer.
  const [modal, setModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [dropPreview, setDropPreview] = useState(null);
  const suppressEditUntil = useRef(0);

  // Recharge les trois collections en parallèle, puis met l'écran à jour.
  const load = useCallback(async () => {
    const [newClients, newEmployees, newInterventions] = await Promise.all([
      api("/api/clients"),
      api("/api/employees"),
      api("/api/interventions"),
    ]);
    setClients(newClients);
    setEmployees(newEmployees);
    setInterventions(newInterventions);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  // Valeurs calculées à partir de la date, de la vue et des filtres courants.
  const weekStart = mondayOf(cursor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  const visible = useMemo(
    () =>
      interventions.filter(
        (item) =>
          (!employeeFilter || item.employeeId === Number(employeeFilter)) &&
          (!clientFilter || item.clientId === Number(clientFilter)),
      ),
    [interventions, employeeFilter, clientFilter],
  );
  const weekEnd = new Date(days[6]);
  const weekLabel = `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
  const week = isoWeek(cursor);
  const changePeriod = (amount) =>
    setCursor((current) => {
      const next = new Date(current);
      if (view === "day") next.setDate(next.getDate() + amount);
      else if (view === "week") next.setDate(next.getDate() + amount * 7);
      else next.setMonth(next.getMonth() + amount);
      return next;
    });
  const periodName =
    view === "day" ? "jour" : view === "week" ? "semaine" : "mois";

  // --- Actions déclenchées depuis l'interface ---
  const openNew = (date, start = "09:00") => {
    const startMinutes = timeInMinutes(`2000-01-01T${start}`);
    const endMinutes = Math.min(startMinutes + 60, END_HOUR * 60);
    setError("");
    setModal({
      type: "intervention",
      date: dateKey(date),
      start,
      end: `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`,
    });
  };
  const removeIntervention = async (item) => {
    if (!window.confirm("Supprimer cette intervention ?")) return;
    try {
      await api(`/api/interventions/${item.id}`, { method: "DELETE" });
      setContextMenu(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  const moveIntervention = async (item, day, startMinutes) => {
    const duration = timeInMinutes(item.endAt) - timeInMinutes(item.startAt);
    const nextStart = Math.min(
      Math.max(START_HOUR * 60, startMinutes),
      END_HOUR * 60 - duration,
    );
    const startAt = dateTime(day, nextStart),
      endAt = dateTime(day, nextStart + duration);
    console.debug("[planning:drag:move]", {
      id: item.id,
      idType: typeof item.id,
      from: [item.startAt, item.endAt],
      to: [startAt, endAt],
    });
    if (startAt === item.startAt && endAt === item.endAt) return;
    // Mise à jour optimiste : le déplacement apparaît avant la réponse du serveur.
    // En cas d'erreur, `previous` permet de restaurer l'ancien planning.
    const previous = interventions;
    setInterventions((current) =>
      current.map((value) =>
        value.id === item.id ? { ...value, startAt, endAt } : value,
      ),
    );
    try {
      await api(`/api/interventions/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          clientId: item.clientId,
          employeeId: item.employeeId,
          startAt,
          endAt,
        }),
      });
      console.debug("[planning:drag:saved]", { id: item.id, startAt, endAt });
      setError("");
    } catch (err) {
      console.error("[planning:drag:error]", {
        id: item.id,
        message: err.message,
      });
      setInterventions(previous);
      setError(`Déplacement impossible : ${err.message}`);
    }
  };
  const startResize = (item, edge, event) => {
    event.preventDefault();
    event.stopPropagation();
    suppressEditUntil.current = Infinity;
    const pointerStart = event.clientY;
    const originalStart = timeInMinutes(item.startAt);
    const originalEnd = timeInMinutes(item.endAt);
    let nextStart = originalStart,
      nextEnd = originalEnd;
    const previous = interventions;
    // Convertit les pixels parcourus par la souris en tranches de 15 minutes.
    const resize = (moveEvent) => {
      const delta =
        Math.round(
          ((moveEvent.clientY - pointerStart) * 60) / HOUR_HEIGHT / 15,
        ) * 15;
      if (edge === "start")
        nextStart = Math.max(
          START_HOUR * 60,
          Math.min(originalEnd - 15, originalStart + delta),
        );
      else
        nextEnd = Math.min(
          END_HOUR * 60,
          Math.max(originalStart + 15, originalEnd + delta),
        );
      const startAt = `${item.startAt.slice(0, 10)}T${pad(Math.floor(nextStart / 60))}:${pad(nextStart % 60)}`;
      const endAt = `${item.endAt.slice(0, 10)}T${pad(Math.floor(nextEnd / 60))}:${pad(nextEnd % 60)}`;
      setInterventions((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, startAt, endAt } : value,
        ),
      );
    };
    // À la fin du geste, nettoie les écouteurs et sauvegarde les nouvelles heures.
    const finish = async () => {
      document.removeEventListener("pointermove", resize);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
      document.body.classList.remove("resizing-event");
      suppressEditUntil.current = Date.now() + 350;
      if (nextStart === originalStart && nextEnd === originalEnd) return;
      const startAt = `${item.startAt.slice(0, 10)}T${pad(Math.floor(nextStart / 60))}:${pad(nextStart % 60)}`;
      const endAt = `${item.endAt.slice(0, 10)}T${pad(Math.floor(nextEnd / 60))}:${pad(nextEnd % 60)}`;
      try {
        await api(`/api/interventions/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            clientId: item.clientId,
            employeeId: item.employeeId,
            startAt,
            endAt,
          }),
        });
        setError("");
      } catch (err) {
        setInterventions(previous);
        setError(`Redimensionnement impossible : ${err.message}`);
      }
    };
    document.body.classList.add("resizing-event");
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
  };

  // --- Interface affichée par React ---
  return (
    <div className="shell" onClick={() => contextMenu && setContextMenu(null)}>
      <aside>
        <div className="brand">
          <span>✦</span>
          <div>
            Maison & soin<small>Planning d'équipe</small>
          </div>
        </div>
        <button className="primary" onClick={() => openNew(new Date())}>
          ＋ Nouvelle intervention
        </button>
        <button
          onClick={() => {
            setError("");
            setModal({ type: "client" });
          }}
        >
          ＋ Nouveau client
        </button>
        <button
          onClick={() => {
            setError("");
            setModal({ type: "employee" });
          }}
        >
          ＋ Nouvelle intervenante
        </button>
        <div className="filter-card">
          <p>FILTRES</p>
          <label>
            Intervenante
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
            >
              <option value="">Toute l'équipe</option>
              {employees.map((person) => (
                <option key={person.id} value={person.id}>
                  {fullName(person)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Client
            <select
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="">Tous les clients</option>
              {clients.map((person) => (
                <option key={person.id} value={person.id}>
                  {fullName(person)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">ESPACE ADMINISTRATION</p>
            <h1>Planning des interventions</h1>
            <p className="muted">Organisez les journées de votre équipe.</p>
          </div>
          <div className="today">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </header>
        <section className="toolbar">
          <div className="week-nav">
            <button
              aria-label={`${periodName} précédent`}
              onClick={() => changePeriod(-1)}
            >
              ← Précédent
            </button>
            <button
              className="today-button"
              onClick={() => setCursor(new Date())}
            >
              Aujourd'hui
            </button>
            <button
              aria-label={`${periodName} suivant`}
              onClick={() => changePeriod(1)}
            >
              Suivant →
            </button>
          </div>
          <div className="week-title">
            <span>
              {view === "week"
                ? `Semaine ${week.number} / ${week.year}`
                : view === "day"
                  ? cursor.toLocaleDateString("fr-FR", { weekday: "long" })
                  : cursor.toLocaleDateString("fr-FR", { year: "numeric" })}
            </span>
            <strong>
              {view === "week"
                ? weekLabel
                : view === "day"
                  ? cursor.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : cursor.toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
            </strong>
          </div>
          <div className="view-switch" aria-label="Mode d'affichage">
            {[
              ["day", "Jour"],
              ["week", "Semaine"],
              ["month", "Mois"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={view === value ? "active" : ""}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && !modal && (
          <div className="planning-error" role="alert">
            {error}
          </div>
        )}
        <Calendar
          view={view}
          cursor={cursor}
          days={days}
          items={visible}
          onNew={openNew}
          onMove={moveIntervention}
          onResize={startResize}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          dropPreview={dropPreview}
          setDropPreview={setDropPreview}
          onCreateContext={(day, start, x, y) =>
            setContextMenu({
              type: "create",
              day,
              start,
              x: Math.min(x, window.innerWidth - 230),
              y: Math.min(y, window.innerHeight - 110),
            })
          }
          onItemContext={(item, x, y) =>
            setContextMenu({
              type: "intervention",
              item,
              x: Math.min(x, window.innerWidth - 230),
              y: Math.min(y, window.innerHeight - 110),
            })
          }
          onEdit={(item, day) => {
            if (Date.now() < suppressEditUntil.current) return;
            setError("");
            setModal({ type: "intervention", item, date: dateKey(day) });
          }}
        />
      </main>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.type === "create" ? (
            <button
              onClick={() => {
                openNew(contextMenu.day, contextMenu.start);
                setContextMenu(null);
              }}
            >
              <span>＋</span> Créer une intervention le{" "}
              {contextMenu.day.toLocaleDateString("fr-FR")} à{" "}
              {contextMenu.start}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setError("");
                  setModal({
                    type: "intervention",
                    item: contextMenu.item,
                    date: contextMenu.item.startAt.slice(0, 10),
                  });
                  setContextMenu(null);
                }}
              >
                <span>✎</span> Modifier l'intervention
              </button>
              <button
                className="context-danger"
                onClick={() => removeIntervention(contextMenu.item)}
              >
                <span>×</span> Supprimer l'intervention
              </button>
            </>
          )}
        </div>
      )}
      {modal && (
        <PlanningModal
          modal={modal}
          clients={clients}
          employees={employees}
          error={error}
          setError={setError}
          close={() => setModal(null)}
          saved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
