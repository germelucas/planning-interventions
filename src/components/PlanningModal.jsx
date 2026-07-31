// Formulaire partagé pour créer une personne ou créer/modifier une intervention.
import { useState } from "react";
import { api } from "../services/api.js";
import { fullName } from "../utils/dates.js";

export default function PlanningModal({ modal, clients, employees, error, setError, close, saved }) {
  const item = modal.item;
  const isPerson = modal.type !== "intervention";
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(
    String(item?.clientId ?? clients[0]?.id ?? ""),
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    String(item?.employeeId ?? employees[0]?.id ?? ""),
  );
  async function submit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    const form = new FormData(event.currentTarget);

    try {
      if (isPerson) {
        const personType = modal.type === "client" ? "clients" : "employees";
        const personPayload = {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
        };

        await api(`/api/${personType}`, {
          method: "POST",
          body: JSON.stringify(personPayload),
        });
      } else {
        const interventionUrl = `/api/interventions${item ? `/${item.id}` : ""}`;
        const interventionMethod = item ? "PATCH" : "POST";
        const interventionPayload = {
          clientId: Number(form.get("clientId")),
          employeeId: Number(form.get("employeeId")),
          startAt: `${form.get("date")}T${form.get("start")}`,
          endAt: `${form.get("date")}T${form.get("end")}`,
        };

        await api(interventionUrl, {
          method: interventionMethod,
          body: JSON.stringify(interventionPayload),
        });
      }

      await saved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }
  async function remove() {
    if (window.confirm("Supprimer cette intervention ?")) {
      await api(`/api/interventions/${item.id}`, { method: "DELETE" });
      await saved();
    }
  }
  return (
    <div
      className="backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <form onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          ×
        </button>
        <h2>
          {modal.type === "client"
            ? "Nouveau client"
            : modal.type === "employee"
              ? "Nouvelle intervenante"
              : item
                ? "Modifier l'intervention"
                : "Nouvelle intervention"}
        </h2>
        {isPerson ? (
          <>
            <label>
              Prénom
              <input name="firstName" required autoFocus />
            </label>
            <label>
              Nom
              <input name="lastName" required />
            </label>
          </>
        ) : (
          <>
            <label>
              Client
              <select
                name="clientId"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                {clients.map((person) => (
                  <option key={person.id} value={person.id}>
                    {fullName(person)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Intervenante
              <select
                name="employeeId"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
              >
                {employees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {fullName(person)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input
                name="date"
                type="date"
                required
                defaultValue={item?.startAt.slice(0, 10) || modal.date}
              />
            </label>
            <div className="row">
              <label>
                Début
                <input
                  name="start"
                  type="time"
                  required
                  defaultValue={
                    item?.startAt.slice(11, 16) || modal.start || "09:00"
                  }
                />
              </label>
              <label>
                Fin
                <input
                  name="end"
                  type="time"
                  required
                  defaultValue={
                    item?.endAt.slice(11, 16) || modal.end || "10:00"
                  }
                />
              </label>
            </div>
          </>
        )}
        <p className="error">{error}</p>
        <div className="actions">
          {item && (
            <button type="button" className="danger" onClick={remove}>
              Supprimer
            </button>
          )}
          <button type="button" onClick={close} disabled={saving}>
            Annuler
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

