import test from "node:test";
import assert from "node:assert/strict";
import {
  dateKey,
  dateTime,
  isoWeek,
  mondayOf,
  timeInMinutes,
} from "../src/utils/dates.js";
import { layoutOverlaps } from "../src/utils/calendar.js";

test("convertit les dates utilisées par l'API", () => {
  const date = new Date(2026, 6, 14, 12);
  assert.equal(dateKey(date), "2026-07-14");
  assert.equal(dateTime(date, 9 * 60 + 15), "2026-07-14T09:15");
  assert.equal(timeInMinutes("2026-07-14T09:15"), 555);
});

test("trouve le lundi et le numéro ISO d'une semaine", () => {
  const date = new Date(2026, 6, 16, 12);
  assert.equal(dateKey(mondayOf(date)), "2026-07-13");
  assert.deepEqual(isoWeek(date), { number: 29, year: 2026 });
});

test("place les interventions qui se chevauchent dans des colonnes", () => {
  const layout = layoutOverlaps([
    { id: 1, startAt: "2026-07-14T09:00", endAt: "2026-07-14T11:00" },
    { id: 2, startAt: "2026-07-14T10:00", endAt: "2026-07-14T12:00" },
    { id: 3, startAt: "2026-07-14T12:00", endAt: "2026-07-14T13:00" },
  ]);
  assert.deepEqual(layout.get(1), { column: 0, columns: 2 });
  assert.deepEqual(layout.get(2), { column: 1, columns: 2 });
  assert.deepEqual(layout.get(3), { column: 0, columns: 1 });
});
