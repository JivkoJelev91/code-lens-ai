# CodeLens AI

AI-powered code review assistant for JavaScript, TypeScript and React applications. It provides multi-file analysis, conversational reviews and automated refactoring suggestions.

## Project structure

```
code-lens-ai/
│
├── client/          React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── ...
│
├── server/          Node.js + Express + TypeScript backend
│   └── src/
│       ├── routes/
│       ├── services/
│       └── ai/
│
└── README.md
```

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

- Client: http://localhost:4000 (Vite)
- Server: http://localhost:4001 (Express)

The client proxies `/api` requests to the server during development.

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Run client and server in watch mode      |
| `npm run build`     | Build client and server for production   |
| `npm start`         | Start the compiled server                |
| `npm run lint`      | Lint client and server with Oxlint       |
| `npm run typecheck` | Type-check both workspaces               |