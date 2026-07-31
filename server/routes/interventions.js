import { Router } from "express";

const wrap = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response)).catch(next);

export function createInterventionsRouter(controller) {
  const router = Router();
  router.get("/", wrap(controller.list));
  router.post("/", wrap(controller.create));
  router.patch("/:id", wrap(controller.update));
  router.delete("/:id", wrap(controller.remove));
  return router;
}
