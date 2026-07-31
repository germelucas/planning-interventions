// Point de démarrage local et serveur de fichiers compilés en production.
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT ?? 8000);
const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(dist));
  app.get("*splat", (_request, response) =>
    response.sendFile(path.join(dist, "index.html")),
  );
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Application disponible sur http://127.0.0.1:${port}`);
});
