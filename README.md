# Route Planner

A frontend route planning tool for delivery drivers. Built as a technical task using React, TypeScript, Mapbox GL JS, and Tailwind CSS.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`.

Requires a Mapbox token in `.env`:
```
VITE_MAPBOX_TOKEN=pk.xxx
```

Falls back to mock data if no token is provided.

## Features

**Stop Management**
- Add stops by clicking the map (snaps to nearest road)
- Search addresses with Mapbox Geocoding autocomplete
- Drag-and-drop reorder in sidebar
- Drag markers on map to reposition
- Up to 25 stops
- Map ↔ sidebar always synced

**Route Display**
- Driving routes via Mapbox Directions API
- Polyline with direction arrows
- Distance + estimated duration
- Debounced recalculation (500ms)

**Optimization**
- Nearest Neighbor for initial solution
- 2-opt local search improvement
- Compare original vs optimized with accept/reject
- Typically under 50ms for 25 stops

**Simulation**
- Animated vehicle following route geometry
- Marker rotates to match direction of travel
- Completed segment highlighted (green vs blue)
- Play / Pause / Reset + speed control (1x, 2x, 4x)

**Export**
- JSON with full geometry
- CSV for spreadsheets
- PDF (printable via browser)

## Architecture

```
src/
├── components/     # MapView, StopsList, SearchInput
├── hooks/          # useRoute (debounced fetch), useSimulation (animation)
├── utils/          # mapbox API, optimization algorithms, geometry, export
├── types/          # TypeScript interfaces
└── App.tsx         # main layout + state management
```

**Optimization approach**: Build a distance matrix (Mapbox Matrix API when available, Haversine fallback), run Nearest Neighbor greedy heuristic from the depot, then improve with 2-opt edge swaps until no improvement is found. Time complexity is O(n²) per iteration.

**Simulation**: Uses `requestAnimationFrame` with delta-time for smooth 60fps animation. Vehicle position interpolated along the route LineString using geodesic distance fractions.

## Stack

- React 18 + hooks
- TypeScript
- Mapbox GL JS v3
- Tailwind CSS v3
- Vite