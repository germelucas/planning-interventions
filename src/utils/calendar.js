// Règles d'affichage et algorithmes propres au calendrier.
import { timeInMinutes } from "./dates.js";

export const START_HOUR = 8;
export const END_HOUR = 22;
export const HOUR_HEIGHT = 48;

// Le navigateur crée normalement une image pendant le glisser-déposer.
// Un canvas transparent permet d'utiliser uniquement notre aperçu personnalisé.
export const hideNativeDragPreview = (event) => {
  const transparent = document.createElement("canvas");
  transparent.width = 1;
  transparent.height = 1;
  event.dataTransfer.setDragImage(transparent, 0, 0);
};

// Les interventions qui se croisent sont regroupées puis distribuées en colonnes.
// La Map retournée indique à chaque carte sa colonne et le nombre total de colonnes.
export const layoutOverlaps = (items) => {
  const layout = new Map();
  const sorted = items
    .map((item) => ({
      item,
      start: timeInMinutes(item.startAt),
      end: timeInMinutes(item.endAt),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  let cluster = [];
  let clusterEnd = -1;
  let columnEnds = [];

  const finishCluster = () => {
    const columns = Math.max(1, columnEnds.length);
    cluster.forEach(({ item, column }) =>
      layout.set(item.id, { column, columns }),
    );
    cluster = [];
    clusterEnd = -1;
    columnEnds = [];
  };

  for (const timedItem of sorted) {
    if (cluster.length && timedItem.start >= clusterEnd) finishCluster();
    let column = columnEnds.findIndex((end) => end <= timedItem.start);
    if (column < 0) column = columnEnds.length;
    columnEnds[column] = timedItem.end;
    cluster.push({ item: timedItem.item, column });
    clusterEnd = Math.max(clusterEnd, timedItem.end);
  }

  if (cluster.length) finishCluster();
  return layout;
};
