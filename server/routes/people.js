import { Router } from "express";

const wrap = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response)).catch(next);

export function createPeopleRouter(controller) {
  const router = Router();
  router.get("/clients", wrap(controller.listClients));
  router.post("/clients", wrap(controller.createClient));
  router.get("/employees", wrap(controller.listEmployees));
  router.post("/employees", wrap(controller.createEmployee));
  return router;
}
