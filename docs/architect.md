# Architect - Room Layout Planner

## Overview

`Architect` handles all room layout planning and building placement. It defines four stamp types (`STAMP_MAIN`, `STAMP_EXTENSION`, `STAMP_TOWER`, `STAMP_LAB`) — pre-defined grids of structures that can be rotated 0-3 times (0°/90°/180°/270° clockwise).

The planning pipeline runs **once per room** during `Executive` construction (when the room is first registered), producing a `RoomSchematic` that is persisted in `Memory.rooms[room].schematic` and reused for all subsequent build operations.

---

## `plan(room)` — One-Time Room Planning

Called once when a room is first registered (checked via `Chronicler.readRoomRegistered`). Returns a `RoomSchematic` containing anchor positions and rotation values for all stamps.

### Algorithm

1. **Cleanup** — Destroys enemy structures (except storage, terminal, nuker)
2. **Distance transform** — Two-pass algorithm producing a cost matrix where each tile holds its Manhattan distance to the nearest wall (0 = wall, higher = more open)
3. **Centroid calculation** — Average position of controller + all sources
4. **Main stamp placement** — Tries up to 7 iterations:
   - Scores candidate anchor positions by `score = distanceMatrix.get(x,y) - distanceToCentroid * 0.25`
   - Evaluates all four corners (top-left, top-right, bottom-left, bottom-right) around the best position
   - For each corner, sums `distanceMatrix` values in a 10x10 area centered on that corner
   - Rotation = index of the corner with the highest score (0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right)
5. **Cost matrix construction** — Marks walls (255), main stamp area (255), 1-tile buffer around sources/minerals (255), and all computed paths (255)
6. **Tower stamp placement** — Finds best 3x3 spot, selects rotation by which corner is closest to center
7. **Lab stamp placement** — Finds best 4x4 spot, selects rotation by which diagonal pair has a corner closest to center
8. **Extension stamp placement** — Complex cluster-based algorithm (see below)
9. **Spawn placement** — Picks 3 closest valid positions near center within 7-tile radius
10. **Retry loop** — If placement fails, forces the main stamp position invalid (sets distance to 1) and retries up to 7 times; throws if room is not viable

---

## `rotateStamp(stamp, rotations)` — Clockwise Rotation

Rotates a square stamp grid 90° clockwise per rotation count. Uses matrix transposition: `new[x_new][y_new] = old[n-1-y][x]` where `n` is grid dimension. Applied recursively until all rotations are consumed.

---

## Stamp Definitions

| Stamp | Size | Layout | Rotation Strategy |
|-------|------|--------|-------------------|
| `STAMP_MAIN` | 3x3 | Storage/Road/Terminal / Nuker/Road/Power Spawn / Link/Observer/Factory | **Evaluated** — scores all 4 corners, picks highest quality |
| `STAMP_EXTENSION` | 3x3 | Ext/Ext/Road / Ext/Road/Ext / Road/Ext/Ext | **Inherited** — alternating 0/1 from parent in tree expansion |
| `STAMP_TOWER` | 3x3 | Tower/Tower/Road / Tower/Road/Tower / Link/Tower/Tower | **Evaluated** — picks corner closest to center |
| `STAMP_LAB` | 4x4 | 16-tile grid of labs/roads | **Evaluated** — picks diagonal pair with closest corner |

---

## Extension Stamp Placement — `placeExtensions(center, costMatrix)`

The most complex placement function. Uses cluster detection and tree-based expansion to find up to 10 viable 3x3 extension spots.

### Step 1 — Cluster Detection

- Scans a 24-tile-wide area around center (±12 tiles)
- Checks every 3x3 window: if all tiles have cost ≤ 10, it's viable
- If any tile has cost > 0, marks as overlapping an existing feature (`isNew = false`)
- Assigns new clusters unique IDs and marks covered tiles with the cluster ID

### Step 2 — Cluster Merging

- Builds a mapper of adjacent clusters that should be merged
- Recursively resolves transitive merges (cluster A merges with B, B merges with C → A, B, C all merge)
- Relabels all tiles in the cost matrix with unified cluster IDs

### Step 3 — Cluster Data Collection

- Iterates the relabeled cost matrix, collecting cluster size and anchor positions
- Visualizes clusters with colored circles during planning

### Step 4 — Tree-Based Expansion

- Sorts clusters by size (largest first)
- Seeds a tree from the largest cluster with `rotations: 1`
- For each tree node, tries expanding right (+3 x), bottom (+3 y), and top (-3 y):
  - Each expansion gets `opposite = 1 - parent.rotations` (alternating 0/1)
  - Checks that the target 3x3 area matches the cluster's cost value
  - Marks occupied tiles with cost 254 to prevent overlap
- Collects all viable spots from all clusters into `viableSpots`

### Step 5 — Sorting and Selection

- Sorts all viable spots by distance from center (closest first)
- Takes the first 10 spots
- Re-sorts by distance from the main stamp anchor (not center)
- Throws if fewer than 9 spots found

### Rotation Inheritance Pattern

The first stamp in each cluster gets `rotations: 1`. As the tree expands, each level flips the rotation (0→1 or 1→0), creating a checkerboard-like alternating pattern. This is purely positional — not evaluated for quality like other stamps.

---

## Build Methods

### `buildExtensions(room, buildRoads)` — Build Extensions from Schema

Iterates through `schema.extensions` (from persisted schematic). Rotates `STAMP_EXTENSION` by the stored rotation value and creates construction sites tile by tile. Stops when all required extensions (from `CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controllerLevel]`) are placed.

### `buildBastions(room, buildRoads)` — Build Towers from Schema

Places `STAMP_TOWER` at `schema.towers.anchor` with `schema.towers.rotations`. Special handling: if game stage ≥ 8, Link structures in the stamp are skipped.

### `buildMain(room, buildRoads)` — Build Main Area from Schema

Places `STAMP_MAIN` at `schema.main.anchor` with `schema.main.rotations`. If `buildRoads` is true, also builds a road border around the entire 5x5 main area (anchor ±1 to ±3).

### `buildWorkshops(room)` — Build Labs from Schema

Places `STAMP_LAB` at `schema.labs.anchor` with `schema.labs.rotations`. Special positioning logic:
- If rotation is even: sorts lab positions by distance from bottom-left corner
- If rotation is odd: sorts lab positions by distance from bottom-right corner
- Creates construction sites in this sorted order (important for lab placement)

### `buildNexus(room)` — Build Spawns from Schema

Creates construction sites at all spawn positions from `schema.spawns`.

### `buildSourceContainers(room)` — Build Source Containers

Creates containers at the end of each source path from `schema.paths.sources`.

### `buildPaths(room)` — Build Roads

Creates roads along all paths from `schema.paths` (sources, controller, exits, mineral).

### `buildControllerLink(room)` — Build Controller Link

Creates a Link at the end of the controller path.

### `buildSourceLink(room)` — Build Source Link

Finds the source closest to main stamp, places a Link adjacent to its container (preferring non-path tiles), and removes the container.

### `buildExitPaths(room, exit)` — Build Exit Roads

Creates roads along the path from main stamp to a specified exit.

### `buildRemotePaths(room, remote, exit)` — Build Remote Room Paths

Builds roads and containers in a remote room from the entrance to each source.

### `buildExtractor(room)` — Build Mineral Extractor

Creates a container, extractor, and road path to the mineral.

---

## Stamp Placement Methods

### `placeMain(centroid, distanceMatrix)` — Main Stamp Placement

1. Finds candidate positions where `distanceMatrix >= 4` (at least 4 tiles from wall)
2. Scores candidates by `score - distanceToCentroid * 0.25`
3. Evaluates 4 corners around the best position (top-left, top-right, bottom-left, bottom-right)
4. For each corner, sums `distanceMatrix` values in a 10x10 area
5. Rotation = index of the corner with the highest score
6. Anchor = best position offset by -1 (top-left of 3x3 stamp)

### `placeTowers(center, costMatrix)` — Tower Stamp Placement

1. Finds all valid 3x3 spots in the room (cost < 255)
2. Picks the spot farthest from center
3. Evaluates 4 corners, picks rotation by which corner is closest to center
4. Anchor = best position offset by -1

### `placeLabs(center, costMatrix)` — Lab Stamp Placement

1. Finds all valid 4x4 spots in the room (cost < 255)
2. Picks the spot farthest from center
3. Evaluates diagonal pairs, picks rotation by closest corner to center
4. Anchor = best position offset by -1

### `placeSpawns(center, costMatrix)` — Spawn Placement

1. Finds all valid positions within 7-tile radius of center (cost < 255)
2. Sorts by distance from center (closest first)
3. Returns top 3 positions

---

## Helper Methods

| Method | Purpose |
|--------|---------|
| `distanceTransform(room)` | Two-pass distance-to-wall algorithm. Forward pass (top-left to bottom-right), backward pass (bottom-right to top-left) |
| `calculateCentroid(roomObj, controller)` | Average position of controller + all sources |
| `path(roomObj, controller, mainStampLocation)` | Computes paths from main stamp to sources, controller, all 4 exits, and mineral. Returns both structured paths and flat position list for cost matrix |
| `terrainMatrix(room)` | Binary wall/non-wall matrix (0xff for walls) |
| `coordinateDistance(x, y, x1, y1)` | Euclidean distance |
| `clearSites(room)` | Removes all construction sites in a room |
| `placeWalls(room)` | Places walls along exit paths using PathFinder (partially implemented) |
| `cleanup(roomObj)` | Destroys enemy-owned structures (preserves storage, terminal, nuker) |

---

## Data Flow

```
Executive constructor
  └── Chronicler.readRoomRegistered(room) ? no
       └── Architect.plan(room)
            ├── Architect.distanceTransform(room)
            ├── Architect.calculateCentroid(room, controller)
            ├── Architect.placeMain(centroid, distanceMatrix)
            ├── Architect.path(roomObj, controller, mainStamp.anchor)
            ├── Architect.placeTowers(center, costMatrix)
            ├── Architect.placeLabs(center, costMatrix)
            ├── Architect.placeExtensions(center, costMatrix)
            └── Architect.placeSpawns(center, costMatrix)
       └── Chronicler.registerRoom(room, schematic, resources)

Every 30 ticks (Executive.run())
  └── Architect.buildRoom(room, buildRoads)
       ├── Architect.buildExtensions(room, buildRoads)
       ├── Architect.buildBastions(room, buildRoads)
       ├── Architect.buildMain(room, buildRoads)
       └── Architect.buildWorkshops(room)
```

---

## Key Design Decisions

1. **One-time planning** — The schematic is computed once and persisted. Re-planning requires a full memory reset.
2. **Evaluated vs inherited rotation** — Main, tower, and lab stamps evaluate corner quality to pick rotation. Extension stamps inherit rotation from their parent in the expansion tree (alternating 0/1).
3. **Cluster-based extension placement** — Extensions are placed in contiguous open areas detected via flood-fill-style clustering, not as isolated 3x3 windows.
4. **Cost matrix as shared resource** — All stamp placements share and mutate a single cost matrix, ensuring non-overlapping placement.
5. **Distance transform for viability** — Rooms where no position has distance ≥ 4 from all walls are considered non-viable.
