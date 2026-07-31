export function createPeopleController(service) {
  return {
    async listClients(_request, response) {
      response.json(await service.listClients());
    },
    async listEmployees(_request, response) {
      response.json(await service.listEmployees());
    },
    async createClient(request, response) {
      response.status(201).json(await service.createClient(request.body));
    },
    async createEmployee(request, response) {
      response.status(201).json(await service.createEmployee(request.body));
    },
  };
}
