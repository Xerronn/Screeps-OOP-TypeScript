# Screeps OOP TypeScript Bot - Deep Analysis

## Architecture Overview

This bot uses a hierarchical, object-oriented architecture organized into four conceptual domains inspired by ancient Roman military/civic structures:

```
Imperator (Dominion Controller)
├── Per-Room Administrators
│   ├── Supervisor (Room-level creep/structure manager)
│   └── Executive (Room-level strategic planner)
├── Logistician (Cross-room market/trade manager)
└── Director (Tick scheduler)
```

### Domain Naming Convention

| Domain | Concept | What It Wraps |
|--------|---------|---------------|
| **Civitas** | Civic/civilian body | Creep objects and their behaviors |
| **Castrum** | Fortress/structure body | Structure objects and their logic |
| **Legion** | Military body | Combat creeps |
| **Administrator** | Management layer | Room-level coordination |
| **Controller** | Planning layer | Room schematics, memory, game state |

---

## Entry Point (`src/main.ts`)

The main loop follows a strict tick order:

1. **`Imperator.checkRespawn()`** - Detects fresh game respawns (1 room, RCL 1, 2 structures, 0 creeps) and resets memory
2. **`Imperator.initialize()`** - Creates `Supervisor` and `Executive` instances for every owned room
3. **`mainLoop()`** - Every tick:
   - `Imperator.refresh()` - Updates live references for all wrapped objects
   - `Director.run()` - Executes any scheduled deferred tasks
   - `Imperator.run()` - Runs all room supervisors and executives

---

## Core Classes

### Imperator - Dominion Controller

**File:** `src/Imperator.ts`

The root singleton that manages the entire bot across all owned rooms.

**Responsibilities:**
- Tracks all owned rooms (`dominion` array)
- Creates per-room `Supervisor` and `Executive` pairs
- Manages a `Logistician` for cross-room trade
- Caches pathfinding cost matrices per room (3000 tick TTL)
- Handles room initialization on new claims (`initializeRoom`)
- Detects respawns and clears memory via `Chronicler`

**Key method - `checkRespawn()`:** Heuristic detection: if there's exactly 1 owned room at RCL 1 with 2 structures and 0 creeps, it's a fresh spawn. Calls `Chronicler.build(true)` to wipe memory.

---

### Supervisor - Room Creep/Structure Manager

**File:** `src/administrators/Supervisor.ts`

Manages all creeps and structures within a single room. Acts as the central registry.

**Data structures:**
- `civitas` - Dictionary of creep type arrays (12 civilian types + 3 military types)
- `castrum` - Dictionary of structure type arrays (6 structure wrapper types)
- `primitives` - Raw IDs for structures without full wrappers (containers, roads)
- `_primitives` - Live object cache for primitives
- `reagentWorkshops` / `productWorkshops` - Self-classified lab references
- `controllerLink` / `storageLink` - Self-classified link references
- `extensionOrder` - Prioritized list of energy structures for spawning

**Key behaviors:**
- `wrap()` - Iterates all room structures/creeps, uses `eval()` to dynamically instantiate wrapper classes. Handles dead creep rebirth.
- `run()` - Executes `preTick()` + `run()` on all creeps, then `run()` on all structures. CPU monitoring (logs if >0.3ms per creep). Error catching with periodic `Game.notify`.
- `initiate()` - Spawns a creep via a Nexus, handles boost preparation, and schedules retries on failure
- `calculateBoosts()` - Returns appropriate boost minerals per creep type (Scholar gets Ghodium Hydride at RCL 7, Catalyzed Ghodium Acid at RCL 8; Executioner gets Catalyzed Ghodium Alkalide + Catalyzed Lomerium Alkalide)
- `getExtensionOrder()` - Returns spawns first, then capacitors (grouped extensions), for optimal energy distribution during spawning

---

### Executive - Room Strategic Planner

**File:** `src/administrators/Executive.ts`

Handles room-level strategy, building progression, and creep spawning decisions.

**Game Stage System:** The Executive drives room progression through discrete game stages (0-8.1).

| Stage | Trigger | Actions |
|-------|---------|---------|
| 1 | RCL 1 | Build first spawn, spawn 5 basic Engineers |
| 3.1 | RCL 3 + tower | Activate phaseOne (multi-room) |
| 4 | RCL 4 | Build source containers, destroy enemy storage |
| 4.1 | RCL 4 + storage + 10k energy | Phase Two: transition to specialized creeps |
| 4.2 | RCL 4 + storage 25k energy | Build bunker roads |
| 4.3 | RCL 4 + bunker roads done | Build roads to sources |
| 5 | RCL 5 | Build controller link |
| 5.1 | RCL 5 + links built | Spawn Arbiter |
| 6 | RCL 6 | Destroy enemy terminal |
| 6.1 | RCL 6 + buildings done | Build first source link |
| 6.2 | RCL 6 + extractor done | Build mineral extractor |
| 6.3 | RCL 6 + extractor done | Spawn Excavator + Scout |
| 6.4 | RCL 6 + scouting done | Select remotes, spawn Emissary |
| 7 | RCL 7 | Second source link, downscale (merge couriers) |
| 7.1 | RCL 7 + storage 100k energy | Build labs/workshops |
| 7.2 | RCL 7 + workshops built | Spawn Chemist for boosting |

**Phase One vs Phase Two:**
- **Phase One (RCL 1-4):** Generic Engineers that build up the room, harvest, and fill extensions/towers
- **Phase Two (RCL 4.1+):** Specialized creeps - Scholars (upgraders), Miners (source harvesting with self-spawned Couriers), Hosts (energy transporters)

**Remote room management (stage >= 6.4):**
- Tracks remote statuses: SAFE, DANGEROUS, UNINTERESTING, CLAIMED, INVADED
- Spawns Emissaries to reserve/claim, Engineers to bootstrap, Miners to harvest
- Garrison creeps when invaders detected; creeps flee back home
- Curators repair roads in remote rooms

---

### Logistician - Cross-Room Trade Manager

**File:** `src/administrators/Logistician.ts`

Manages market orders and inter-room resource transfers.

**Key behaviors:**
- `requistion()` - Checks owned room surplus first, falls back to market purchase
- `purchase()` - Calculates 2-week average price with IQR outlier removal, includes energy transfer costs, buys immediately if cheaper than creating a buy order
- `sell()` - Lists at 85% of 2-week average price
- `getTwoWeekAverages()` - 14-day average with IQR outlier removal

**Target reserves:** 50,000 energy, 10,000 of each mineral in terminal

---

### Director - Tick Scheduler

**File:** `src/controllers/Director.ts`

Deferred task execution stored in `Memory.directives`. Stores JavaScript strings to execute at future ticks with argument arrays. Failed tasks reschedule for 25 ticks later. Used for delayed creep spawning and rebirth scheduling.

---

## Castrum (Structure Wrappers)

All extend `Castrum` -> `GameObj`.

| Wrapper | Structure | Behavior |
|---------|-----------|----------|
| **Nexus** | Spawn | Smart move-part reduction when roads built, uses `energyStructures` for optimal spawn energy distribution |
| **Conduit** | Link | Self-classifies as storage/controller/container type based on nearby structures |
| **Bastion** | Tower | Attack > repair roads/containers > heal friendly creeps. Finds repair targets every 100 ticks |
| **Workshop** | Lab | Self-classifies as REAGENT or PRODUCT. Product labs run reactions when both reagents ready |
| **Market** | Terminal | Every 5 ticks, checks resource levels, issues requistion/sell orders via Logistician |
| **Capacitor** | Extension group | Groups 3x3 extension clusters for prioritized energy distribution during spawning |

---

## Civitas (Creep Classes)

All creeps extend `Civitas` -> `GameObj`. Common features: `march()` for cross-room travel, `preTick()` for boosting/healing, `moveByPath()` with creep swapping, and a **rebirth system** for creeps with `memory.generation !== undefined`.

### Civilian Creeps

| Creep | Role | Key Behaviors |
|-------|------|---------------|
| **Worker** (base) | Utility | upgradeController, build, withdraw/deposit, pillage, replace |
| **Miner** | Source harvester | Harvests source, deposits to container/link. Self-spawns Couriers based on travel distance math. Evolves body after link acquisition |
| **Courier** | Hauler | Caches bidirectional paths between container and storage/terminal. Picks up dropped energy and tombstones |
| **Engineer** | Phase One builder | Harvests > fill towers > fill extensions > build > upgrade. Body scales with energy capacity |
| **Scholar** | Upgrader | Withdraws from link, upgrades controller. Evolves to 15 WORK at RCL 8, dynamically adjusts based on storage |
| **Arbiter** | Energy manager | Stationary at main stamp. Manages link energy (keeps near zero) and terminal at 25k. Single MOVE for cross-room |
| **Host** | Energy transporter | Fills extensions via capacitors, fills towers, then idles. Has **renew system** - renews itself when ticksToLive < 300 |
| **Contractor** | Dedicated builder | Builds construction sites, then upgrades controller when done |
| **Scout** | Explorer | Explores adjacent rooms, logs status and source distances. Suicides when all explored |
| **Excavator** | Mineral harvester | Harvests via extractor, spawns mineral courier at 1500 mineral. Schedules rebirth for regeneration |
| **Chemist** | Chemical producer | Produces Ghodium Hydride (RCL 7) or Catalyzed Ghodium Acid (RCL 8) through full mineral compound chain |
| **Curator** | Road repairer | Remote room road repairer. Withdraws from containers, repairs roads, suicides when done |
| **Emissary** | Room claimer | Tasks: reserve, claim, catchup, done. Signs controllers with random Latin phrases. Self-schedules rebirth |

### Military Creeps (Legion)

| Creep | Role | Body |
|-------|------|------|
| **Legionnaire** (base) | Combat | March, attack hostile spawns, melee/ranged, medic |
| **Executioner** | Heavy assault | 5xTOUGH, 8xRANGED_ATTACK, 8xHEAL, 24xMOVE. Boosted |
| **Garrison** | Room defender | 6xTOUGH, 4xATTACK, 3xRANGED_ATTACK, 3xHEAL. Garrisons at room center |
| **Jester** | Harassment | 1xATTACK, 2xMOVE. Hit-and-run |

---

## Controllers (Planning Layer)

### Chronicler - Memory Manager

All state lives in `Memory`. Provides read/write accessors for room schematics, game stages, remote data, boost tracking, and statistics. Every spawn, harvest, deposit, and upgrade is tracked for performance monitoring.

### Architect - Room Planner

**`plan(room)`** - The main room planning algorithm:
1. Cleans enemy structures
2. Computes **distance transform** (distance from nearest wall per tile, two-pass algorithm)
3. Calculates centroid of controller + sources
4. Tries up to 7 positions for the main stamp, scoring by wall distance and centroid proximity
5. Determines optimal rotation by evaluating corner quality
6. Builds cost matrix blocking walls, stamp, sources, minerals, paths
7. Places towers, labs, extensions, spawns in non-overlapping positions using cluster detection

**Stamps:** Predefined rotatable building layouts for main area, extensions, towers, and labs.

**`placeExtensions()`** - Complex cluster-finding: identifies viable 3x3 areas, merges adjacent clusters via mapper reduction, sorts by size then distance from center.

### Informant - Room Intelligence

- `getWrapper(id)` - Finds wrapper for a game object ID
- `prospect(room)` - Scans sources for buildable space
- `calculateGameStage()` - Determines stage from RCL, structures, energy, construction sites
- `getCostMatrix()` - Builds pathfinding cost matrix (roads=1, containers=5, everything else=255)
- `getChemicalSteps()` - Returns mineral compound chain for boosting

---

## Third-Party: Traveler

**File:** `src/thirdParty/traveler.ts`

Cross-room pathfinding extending `Creep.prototype.travelTo()`:
- Serialized paths as direction strings in `creep.memory._trav`
- Stuck detection triggering fresh pathfinding
- Creep swapping (pushes blocking friendly creeps)
- Cost matrix caching (structure-only and structure+creep)
- Highway bias (prefers coordinates divisible by 10)
- SK room avoidance when no vision
- Uses `Game.map.findRoute` for rooms >2 hops away

---

## Design Patterns & Notable Decisions

1. **Dynamic class instantiation via eval()** - Supervisor creates wrappers from type strings, avoiding massive switch statements
2. **Rebirth system** - Creeps with `memory.generation` auto-respawn; generation counter increments each cycle
3. **Self-classifying structures** - Links and labs determine their role from position
4. **Game stage progression** - Checkpoint-driven room development, checked every 30 ticks
5. **Capacitors** - 3x3 extension groups as prioritized energy reservoirs
6. **CPU monitoring** - Logs per-creep CPU usage, flags anything over 0.3ms
7. **Latin phrases** - Emissaries sign controllers with random Latin sayings
8. **Error handling** - try/catch on every creep/structure with `Game.notify` on recurring errors
9. **Statistics tracking** - Every action tracked in Memory for performance analysis
10. **Market economics** - IQR-based outlier removal on 14-day price history, buys at 115%, sells at 85%

---

## File Structure

```
src/
├── main.ts                    # Entry point, main loop
├── gameObj.ts                 # Abstract base class for all game objects
├── Imperator.ts               # Dominion-level controller
├── globalTypes.d.ts           # TypeScript type definitions
├── administrators/
│   ├── Supervisor.ts          # Per-room creep/structure registry
│   ├── Executive.ts           # Per-room strategic planner
│   └── Logistician.ts         # Cross-room market/trade
├── controllers/
│   ├── Director.ts            # Tick-based task scheduler
│   ├── Architect.ts           # Room layout planner
│   ├── Chronicler.ts          # Memory read/write manager
│   └── Informant.ts           # Room intelligence queries
├── civitas/
│   ├── Civitas.ts             # Abstract base class for all creeps
│   ├── workers/
│   │   ├── Worker.ts          # Base civilian creep
│   │   ├── Miner.ts           # Source harvester
│   │   ├── Courier.ts         # Resource hauler
│   │   ├── Engineer.ts        # Phase One builder
│   │   ├── Scholar.ts         # Controller upgrader
│   │   ├── Arbiter.ts         # Stationary energy manager
│   │   ├── Host.ts            # Energy transporter + renewer
│   │   ├── Contractor.ts      # Dedicated builder
│   │   ├── Scout.ts           # Remote room explorer
│   │   ├── Excavator.ts       # Mineral harvester
│   │   ├── Chemist.ts         # Chemical producer
│   │   ├── Curator.ts         # Road repairer
│   │   └── Emissary.ts        # Room claimer/reserver
│   └── Legion/
│       ├── Legionnaire.ts     # Base military creep
│       ├── Executioner.ts     # Heavy assault
│       ├── Garrison.ts        # Room defender
│       └── Jester.ts          # Harassment
├── castrum/
│   ├── Castrum.ts             # Abstract base class for structures
│   ├── Nexus.ts               # Spawn wrapper
│   ├── Conduit.ts             # Link wrapper
│   ├── Workshop.ts            # Lab wrapper
│   ├── Bastion.ts             # Tower wrapper
│   ├── Market.ts              # Terminal wrapper
│   └── Capacitor.ts           # Extension group
└── thirdParty/
    └── traveler.ts            # Cross-room pathfinding
```

---

## Build System

- TypeScript 4.3.5 with typed-screeps
- Rollup bundler with rollup-plugin-screeps for deployment
- ESLint + Prettier for code quality
- Mocha + Chai for testing
- Multiple deployment targets: main, pserver, season, sim
