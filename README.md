# Planning d'interventions

Stack : React + Vite, API Node.js/Express et base SQLite.

## Développement

```powershell
npm install
npm run dev
```

Ouvrir http://localhost:5173. La base existante `planning.db` est conservée.

## Production

```powershell
npm run build
$env:NODE_ENV="production"
npm start
```

Ouvrir http://127.0.0.1:8000.

## Tests

```powershell
npm test
```
