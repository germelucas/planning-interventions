export function createInterventionController(service) {
  return {
    async list(_request, response) {
      response.json(await service.list());
    },
    async create(request, response) {
      response.status(201).json(await service.create(request.body));
    },
    async update(request, response) {
      response.json(await service.update(request.params.id, request.body));
    },
    async remove(request, response) {
      await service.remove(request.params.id);
      response.json({ deleted: true });
    },
  };
}
