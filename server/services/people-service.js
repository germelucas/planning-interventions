import { validatePerson } from "../validators/planning.js";

export function createPeopleService(repository) {
  return {
    listClients: () => repository.findAll("clients"),
    listEmployees: () => repository.findAll("employees"),
    createClient: (body) =>
      repository.create("clients", validatePerson(body)),
    createEmployee: (body) =>
      repository.create("employees", validatePerson(body)),
    clientExists: (id) => repository.exists("clients", id),
    employeeExists: (id) => repository.exists("employees", id),
  };
}
