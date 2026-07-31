// Affichage compact d'un mois et déplacement d'une intervention entre deux jours.
import { hideNativeDragPreview } from "../utils/calendar.js";
import { dateKey, timeInMinutes } from "../utils/dates.js";

export default function MonthView({
  cursor,
  items,
  onNew,
  onItemContext,
  onMove,
  draggingId,
  setDraggingId,
}) {
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const first = new Date(year, month, 1),
    offset = (first.getDay() + 6) % 7;
  return (
    <section className="month-calendar">
      <div className="month-weekdays">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="month-grid">
        {Array.from({ length: 42 }, (_, index) => {
          const date = new Date(year, month, index - offset + 1),
            dateId = dateKey(date);
          const dayItems = items.filter(
            (item) => item.startAt.slice(0, 10) === dateId,
          );
          return (
            <div
              key={dateId}
              className={`${date.getMonth() === month ? "" : "outside"} ${dateId === dateKey(new Date()) ? "current" : ""} ${draggingId ? "drop-ready" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const item = items.find(
                  (value) =>
                    value.id ===
                    Number(event.dataTransfer.getData("text/plain")),
                );
                if (item) onMove(item, date, timeInMinutes(item.startAt));
                setDraggingId(null);
              }}
              onDoubleClick={() => onNew(date)}
            >
              <b className="month-number">{date.getDate()}</b>
              {dayItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  draggable
                  className={`month-event color-${item.employeeId % 4} ${draggingId === item.id ? "dragging" : ""}`}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onItemContext(item, event.clientX, event.clientY);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", String(item.id));
                    event.dataTransfer.effectAllowed = "move";
                    hideNativeDragPreview(event);
                    setDraggingId(item.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <strong>{item.startAt.slice(11, 16)}</strong>{" "}
                  {item.clientFirstName}
                </button>
              ))}
              {dayItems.length > 3 && (
                <small>+ {dayItems.length - 3} autres</small>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

