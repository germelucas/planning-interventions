// Assemblage de l'application Express : middlewares, routes et gestion des erreurs.
import { randomUUID } from "node:crypto";
import express from "express";
import { createInterventionController } from "./controllers/intervention-controller.js";
import { createPeopleController } from "./controllers/people-controller.js";
import { openDatabase } from "./database.js";
import { createInterventionRepository } from "./repositories/intervention-repository.js";
import { createPeopleRepository } from "./repositories/people-repository.js";
import { createInterventionsRouter } from "./routes/interventions.js";
import { createPeopleRouter } from "./routes/people.js";
import { createInterventionService } from "./services/intervention-service.js";
import { createPeopleService } from "./services/people-service.js";

export function createApp({ database } = {}) {
  const db = database ?? openDatabase();
  const app = express();
  const peopleRepository = createPeopleRepository(db);
  const interventionRepository = createInterventionRepository(db);
  const peopleService = createPeopleService(peopleRepository);
  const interventionService = createInterventionService(
    interventionRepository,
    peopleService,
  );
  const peopleController = createPeopleController(peopleService);
  const interventionController =
    createInterventionController(interventionService);

  app.use(express.json());

  // Vercel transmet la route réelle dans `path`; localement les URLs /api restent directes.
  app.use((request, _response, next) => {
    if (
      request.path === "/api/handler" &&
      typeof request.query.path === "string" &&
      request.query.path.startsWith("/api/")
    ) {
      request.url = request.query.path;
    }
    next();
  });

  // Le requestId permet de retrouver dans les logs serveur l'action partie du navigateur.
  app.use((request, response, next) => {
    const requestId = request.get("X-Request-Id") || randomUUID();
    const startedAt = Date.now();
    const requestPath = request.path;
    response.set("X-Request-Id", requestId);
    response.on("finish", () => {
      if (request.method !== "GET") {
        console.info(JSON.stringify({
          event: "api_request",
          requestId,
          method: request.method,
          path: requestPath,
          status: response.statusCode,
          durationMs: Date.now() - startedAt,
        }));
      }
    });
    next();
  });

  app.use("/api", createPeopleRouter(peopleController));
  app.use(
    "/api/interventions",
    createInterventionsRouter(interventionController),
  );
  app.use("/api", (_request, response) =>
    response.status(404).json({ error: "Ressource introuvable." }),
  );

  // Toutes les erreurs métier gardent un format JSON unique pour le frontend.
  app.use((error, _request, response, _next) => {
    const conflict = error?.code === "23P01";
    console.error(JSON.stringify({
      event: "api_error",
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    }));
    response.status(conflict ? 409 : error.status ?? 400).json({
      error: conflict
        ? "Cette intervenante a déjà une intervention sur ce créneau."
        : error.message || "Cette opération est impossible.",
    });
  });

  return app;
}
