// Fonctions de date partagées par le planning et indépendantes de React.
export const pad = (value) => String(value).padStart(2, "0");

export const dateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fullName = (person) => `${person.firstName} ${person.lastName}`;

export const dateTime = (date, minutes) =>
  `${dateKey(date)}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const timeInMinutes = (value) =>
  Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));

export const mondayOf = (date) => {
  const monday = new Date(date);
  // Midi évite les surprises lors des changements d'heure.
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};

export const isoWeek = (date) => {
  const value = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return {
    number: Math.ceil(((value - yearStart) / 86400000 + 1) / 7),
    year: value.getUTCFullYear(),
  };
};
