# Route Planner :
A frontend route planning tool for delivery drivers. Built as a technical task using React, TypeScript, Mapbox GL JS, and Tailwind CSS.

## Setup
npm install
npm run dev

Runs on `http://localhost:3000`.

Requires a Mapbox token in `.env`:
VITE_MAPBOX_TOKEN=pk.xxx
Falls back to mock data if no token is provided.

## Architecture
src/
├── components/     # MapView, StopsList, SearchInput
├── store/          # hooks, stopsSlice, store
├── hooks/          # useRoute (debounced fetch), useSimulation (animation)
├── utils/          # mapbox API, optimization algorithms, geometry, export
├── types/          # TypeScript interfaces
└── App.tsx         # main layout + state management
