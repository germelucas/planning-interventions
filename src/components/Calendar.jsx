// Choisit la vue du calendrier et relie ses événements à l'orchestrateur App.
import DayColumn from "./DayColumn.jsx";
import MonthView from "./MonthView.jsx";
import { END_HOUR, HOUR_HEIGHT, START_HOUR } from "../utils/calendar.js";
import { dateKey, pad } from "../utils/dates.js";

export default function Calendar({
  view,
  cursor,
  days,
  items,
  onNew,
  onMove,
  onResize,
  draggingId,
  setDraggingId,
  dropPreview,
  setDropPreview,
  onCreateContext,
  onItemContext,
  onEdit,
}) {
  if (view === "month") {
    return (
      <MonthView
        cursor={cursor}
        items={items}
        onNew={onNew}
        onItemContext={onItemContext}
        onMove={onMove}
        draggingId={draggingId}
        setDraggingId={setDraggingId}
      />
    );
  }

  const displayedDays = view === "day" ? [cursor] : days;

  return (
    <section className={`calendar ${view === "day" ? "day-view" : ""}`}>
      <div className="calendar-head">
        <div className="hours-corner">Heure</div>
        {displayedDays.map((day) => (
          <div
            key={dateKey(day)}
            className={`calendar-day ${dateKey(day) === dateKey(new Date()) ? "active" : ""}`}
          >
            <span>{day.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
            <b>{day.getDate()}</b>
          </div>
        ))}
      </div>

      <div className="calendar-body">
        <div className="hours">
          {Array.from(
            { length: END_HOUR - START_HOUR - 1 },
            (_, index) => (
              <span key={index} style={{ top: (index + 1) * HOUR_HEIGHT }}>
                {pad(START_HOUR + index + 1)}:00
              </span>
            ),
          )}
        </div>

        {displayedDays.map((day) => (
          <DayColumn
            key={dateKey(day)}
            day={day}
            items={items.filter(
              (item) => item.startAt.slice(0, 10) === dateKey(day),
            )}
            allItems={items}
            onNew={(start) => onNew(day, start)}
            onContextRequest={(start, x, y) =>
              onCreateContext(day, start, x, y)
            }
            onItemContext={onItemContext}
            onEdit={(item) => onEdit(item, day)}
            onMove={onMove}
            onResize={onResize}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            dropPreview={dropPreview}
            setDropPreview={setDropPreview}
          />
        ))}
      </div>
    </section>
  );
}
