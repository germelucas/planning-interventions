// Validation syntaxique pure : aucune dépendance HTTP ou base de données.
export function validatePerson(body) {
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  if (!firstName || !lastName) {
    throw new Error("Le prénom et le nom sont obligatoires.");
  }
  return { firstName, lastName };
}

export function validateIntervention(body) {
  const clientId = Number(body?.clientId);
  const employeeId = Number(body?.employeeId);
  const startAt = String(body?.startAt ?? "");
  const endAt = String(body?.endAt ?? "");
  const dateTimeFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

  if (!Number.isInteger(clientId) || !Number.isInteger(employeeId)) {
    throw new Error("Le client et l'intervenante sont obligatoires.");
  }
  if (!dateTimeFormat.test(startAt) || !dateTimeFormat.test(endAt)) {
    throw new Error("Les dates et heures sont invalides.");
  }
  if (startAt >= endAt) {
    throw new Error("L'heure de fin doit être après l'heure de début.");
  }
  return { clientId, employeeId, startAt, endAt };
}

export function validateInterventionId(value) {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new Error("Identifiant invalide.");
  return id;
}
