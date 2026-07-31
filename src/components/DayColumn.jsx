// Colonne interactive utilisée dans les vues jour et semaine.
import { END_HOUR, HOUR_HEIGHT, START_HOUR, hideNativeDragPreview, layoutOverlaps } from "../utils/calendar.js";
import { dateKey, dateTime, pad, timeInMinutes } from "../utils/dates.js";

export default function DayColumn({
  day,
  items,
  allItems,
  onNew,
  onContextRequest,
  onItemContext,
  onEdit,
  onMove,
  onResize,
  draggingId,
  setDraggingId,
  dropPreview,
  setDropPreview,
}) {
  const dayId = dateKey(day);
  const overlapLayout = layoutOverlaps(items);
  const preview = dropPreview?.day === dayId ? dropPreview : null;
  const previewItem =
    preview && allItems.find((item) => item.id === preview.itemId);
  const previewDuration = previewItem
    ? timeInMinutes(previewItem.endAt) - timeInMinutes(previewItem.startAt)
    : 0;
  const previewTop = preview
    ? ((preview.startMinutes - START_HOUR * 60) * HOUR_HEIGHT) / 60
    : 0;
  const previewHeight = Math.max(44, (previewDuration * HOUR_HEIGHT) / 60);
  const updatePreview = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const item = allItems.find((value) => value.id === draggingId);
    if (!item) return;
    const duration = timeInMinutes(item.endAt) - timeInMinutes(item.startAt);
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes =
      START_HOUR * 60 + ((event.clientY - rect.top) * 60) / HOUR_HEIGHT;
    const startMinutes = Math.min(
      Math.max(START_HOUR * 60, Math.round(rawMinutes / 15) * 15),
      END_HOUR * 60 - duration,
    );
    if (
      dropPreview?.day !== dayId ||
      dropPreview.startMinutes !== startMinutes ||
      dropPreview.itemId !== item.id
    )
      setDropPreview({ day: dayId, startMinutes, itemId: item.id });
  };
  const createFromRightClick = (event) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const rawMinutes =
      START_HOUR * 60 + ((event.clientY - rect.top) * 60) / HOUR_HEIGHT;
    const startMinutes = Math.min(
      Math.max(START_HOUR * 60, Math.round(rawMinutes / 15) * 15),
      (END_HOUR - 1) * 60,
    );
    onContextRequest(
      `${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`,
      event.clientX,
      event.clientY,
    );
  };
  return (
    <div
      className={`day-column ${dayId === dateKey(new Date()) ? "current" : ""} ${draggingId ? "drop-ready" : ""}`}
      onContextMenu={createFromRightClick}
      onDragOver={updatePreview}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setDropPreview(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const item = allItems.find(
          (value) =>
            value.id === Number(event.dataTransfer.getData("text/plain")),
        );
        if (item && preview) onMove(item, day, preview.startMinutes);
        setDraggingId(null);
        setDropPreview(null);
      }}
      onDoubleClick={() => onNew()}
    >
      {previewItem && (
        <div
          className={`event drop-preview color-${previewItem.employeeId % 4}`}
          style={{ top: previewTop, height: previewHeight }}
        >
          <b>
            {dateTime(day, preview.startMinutes).slice(11)} –{" "}
            {dateTime(day, preview.startMinutes + previewDuration).slice(11)}
          </b>
          <span>
            {previewItem.clientFirstName} {previewItem.clientLastName}
          </span>
          <small>Relâchez pour déposer</small>
        </div>
      )}
      {items.map((item) => {
        const [startHour, startMinute] = item.startAt
          .slice(11, 16)
          .split(":")
          .map(Number);
        const [endHour, endMinute] = item.endAt
          .slice(11, 16)
          .split(":")
          .map(Number);
        const top = Math.max(
          0,
          (((startHour - START_HOUR) * 60 + startMinute) * HOUR_HEIGHT) / 60,
        );
        const duration =
          endHour * 60 + endMinute - (startHour * 60 + startMinute);
        const height = Math.max(44, (duration * HOUR_HEIGHT) / 60);
        const { column, columns } = overlapLayout.get(item.id) || {
          column: 0,
          columns: 1,
        };
        const eventStyle = {
          top,
          height,
          left: `calc(${(column * 100) / columns}% + 3px)`,
          width: `calc(${100 / columns}% - 6px)`,
          right: "auto",
        };
        return (
          <button
            key={item.id}
            draggable
            className={`event color-${item.employeeId % 4} ${draggingId === item.id ? "dragging" : ""}`}
            style={eventStyle}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onItemContext(item, event.clientX, event.clientY);
            }}
            onDragStart={(event) => {
              if (event.target.closest(".resize-handle")) {
                event.preventDefault();
                return;
              }
              event.stopPropagation();
              event.dataTransfer.setData("text/plain", String(item.id));
              event.dataTransfer.effectAllowed = "move";
              hideNativeDragPreview(event);
              setDraggingId(item.id);
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDropPreview(null);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
            title="Maintenez et déplacez pour changer le créneau"
          >
            <i
              className="resize-handle resize-handle-top"
              onPointerDown={(event) => onResize(item, "start", event)}
              title="Modifier l’heure de début"
              aria-label="Modifier l’heure de début"
            />
            <b>
              {item.startAt.slice(11, 16)} – {item.endAt.slice(11, 16)}
            </b>
            <span>
              {item.clientFirstName} {item.clientLastName}
            </span>
            <small>
              {item.employeeFirstName} {item.employeeLastName}
            </small>
            <i
              className="resize-handle resize-handle-bottom"
              onPointerDown={(event) => onResize(item, "end", event)}
              title="Modifier l’heure de fin"
              aria-label="Modifier l’heure de fin"
            />
          </button>
        );
      })}
    </div>
  );
}

