# Judilibre MCP Deployable

Ce projet fournit un serveur MCP distant compatible avec Perplexity pour exposer Judilibre comme connecteur personnalisé.

## Fichiers
- `server.js` : serveur MCP + SSE
- `package.json` : dépendances Node.js
- `.env.example` : variables d'environnement à compléter
- `Dockerfile` : déploiement conteneurisé
- `render.yaml` : déploiement Render
- `railway.json` : déploiement Railway

## Variables à renseigner
- `JUDILIBRE_BASE_URL` : base URL de votre backend Judilibre
- `MCP_API_KEY` : clé que vous utiliserez dans Perplexity

## Démarrage local
```bash
cp .env.example .env
npm install
npm start
```

## Vérification locale
- Health: `http://localhost:3000/health`
- SSE MCP: `http://localhost:3000/mcp/sse`
- JSON-RPC MCP: `http://localhost:3000/mcp/message`

## Déploiement Render
1. Poussez le dossier sur GitHub.
2. Créez un nouveau service Web sur Render.
3. Render peut lire `render.yaml`, ou vous pouvez configurer manuellement :
   - Build command : `npm install`
   - Start command : `npm start`
4. Ajoutez les variables d'environnement.

## Déploiement Railway
1. Poussez le dossier sur GitHub.
2. Créez un nouveau projet Railway depuis le dépôt.
3. Définissez `JUDILIBRE_BASE_URL` et `MCP_API_KEY`.
4. Déployez.

## Ajout dans Perplexity
Dans Perplexity : `Settings > Connectors > + Custom connector > Remote`
- URL : `https://votre-domaine/mcp/sse`
- Auth : API key
- En-tête / clé : `x-api-key`
- Valeur : votre `MCP_API_KEY`

## Important
Ce projet est prêt au déploiement, mais vous devez remplacer l'URL Judilibre d'exemple par votre vraie URL de backend / proxy Judilibre.
