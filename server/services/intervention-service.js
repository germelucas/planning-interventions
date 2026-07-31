import { HttpError } from "../errors/http-error.js";
import {
  validateIntervention,
  validateInterventionId,
} from "../validators/planning.js";

export function createInterventionService(repository, peopleService) {
  const validateBusinessRules = async (body, excludedId = null) => {
    const value = validateIntervention(body);
    if (!(await peopleService.clientExists(value.clientId))) {
      throw new HttpError(400, "Le client sélectionné n'existe pas.");
    }
    if (!(await peopleService.employeeExists(value.employeeId))) {
      throw new HttpError(400, "L'intervenante sélectionnée n'existe pas.");
    }
    if (await repository.findOverlap({ ...value, excludedId })) {
      throw new HttpError(
        400,
        "Cette intervenante a déjà une intervention sur ce créneau.",
      );
    }
    return value;
  };

  return {
    list: () => repository.findAll(),
    async create(body) {
      return repository.create(await validateBusinessRules(body));
    },
    async update(rawId, body) {
      const id = validateInterventionId(rawId);
      if (!(await repository.findById(id))) {
        throw new HttpError(404, "Intervention introuvable.");
      }
      return repository.update(id, await validateBusinessRules(body, id));
    },
    async remove(rawId) {
      const id = validateInterventionId(rawId);
      if (!(await repository.remove(id))) {
        throw new HttpError(404, "Intervention introuvable.");
      }
    },
  };
}
