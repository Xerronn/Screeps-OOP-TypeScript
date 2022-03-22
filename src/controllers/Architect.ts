import Chronicler from "./Chronicler";

/**
 * Stamps. Can be rotated
 */
const STAMP_MAIN: Stamp = [
    [STRUCTURE_STORAGE, STRUCTURE_ROAD, STRUCTURE_TERMINAL],
    [STRUCTURE_NUKER, STRUCTURE_ROAD, STRUCTURE_POWER_SPAWN],
    [STRUCTURE_LINK, STRUCTURE_ROAD, STRUCTURE_FACTORY]

]

const STAMP_EXTENSION: Stamp = [
    [STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
    [STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
    [STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION]
]

const STAMP_TOWER: Stamp = [
    [STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_ROAD],
    [STRUCTURE_TOWER, STRUCTURE_ROAD, STRUCTURE_TOWER],
    [STRUCTURE_LINK, STRUCTURE_TOWER, STRUCTURE_TOWER]
]

const STAMP_LAB: Stamp = [
    [STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD],
    [STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD, STRUCTURE_LAB],
    [STRUCTURE_LAB, STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB],
    [STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD]
]

/**
 * A function to rotate a room stamp
 * @param stamp A room planning stamp
 * @param degrees The degrees to rotate it by
 */
function rotateStamp(stamp: Stamp, rotations: number): Stamp {
    if (rotations == 0) return stamp;
    if (rotations < 0) {
        throw new Error("Rotations must be a positive integer");
    }
    let n = Object.keys(stamp).length;

    let rotated: Stamp = [[]];
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            let x_new = n - 1 - y;
            let y_new = x;

            if (rotated[x_new] == undefined) {
                rotated[x_new] = [];
            }
            rotated[x_new][y_new] = stamp[x][y];
        }
    }
    rotations -= 1;
    return rotateStamp(rotated, rotations);
}

export default class Architect {
    room: string;

    constructor(room: string) {
        room = room;
    }

    static buildRoom(room: string, buildRoads: boolean) {
        this.buildExtensions(room, buildRoads);
        this.buildBastions(room, buildRoads);
        this.buildMain(room, buildRoads);
    }

    /**
     * Function to build extensions based on the stamp locations
     * @param room 
     * @param buildRoads 
     * @returns 
     */
    static buildExtensions(room: string, buildRoads: boolean) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let numExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controller.level];
        if (numExtensions == 0) return;
        for (let stamp of schema.extensions) {
            let rotated = rotateStamp(STAMP_EXTENSION, stamp.rotations);
            let dimensions = rotated.length;
            for (let x = 0; x < dimensions; x++) {
                for (let y = 0; y < dimensions; y++) {
                    let building = rotated[x][y];
                    if (building === STRUCTURE_ROAD && !buildRoads) continue;
                    if (building === STRUCTURE_EXTENSION) {
                        numExtensions--;
                    }
                    let pos = new RoomPosition(stamp.anchor.x + x, stamp.anchor.y + y, room);
                    pos.createConstructionSite(building);
                    if (numExtensions <= 0) return;
                }
            }
        }
    }

    /**
     * Method to build bastions based on the stamp locations
     * @param room 
     * @param buildRoads 
     * @returns 
     */
    static buildBastions(room: string, buildRoads: boolean) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let numBastions = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][controller.level];
        if (numBastions == 0) return;
        let stamp = schema.towers;
        let rotated = rotateStamp(STAMP_TOWER, stamp.rotations);
        let dimensions = rotated.length;
        for (let x = 0; x < dimensions; x++) {
            for (let y = 0; y < dimensions; y++) {
                let building = rotated[x][y];
                if (building === STRUCTURE_ROAD && !buildRoads) continue;
                if (building === STRUCTURE_TOWER) {
                    numBastions--;
                }
                let pos = new RoomPosition(stamp.anchor.x + x, stamp.anchor.y + y, room);
                pos.createConstructionSite(building);
                if (numBastions <= 0) return;
            }
        }
    }

    /**
     * Method to build and repair main stamp
     * @param room 
     * @param buildRoads 
     */
    static buildMain(room: string, buildRoads: boolean) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let stamp = schema.main;
        let rotated = rotateStamp(STAMP_MAIN, stamp.rotations);
        let dimensions = rotated.length;
        for (let x = 0; x < dimensions; x++) {
            for (let y = 0; y < dimensions; y++) {
                let building = rotated[x][y];
                if (building === STRUCTURE_ROAD && !buildRoads) continue;
                let pos = new RoomPosition(stamp.anchor.x + x, stamp.anchor.y + y, room);
                pos.createConstructionSite(building);
            }
        }
    }

    /**
     * Method to build source containers
     * @param {String} room string representing the room
     */
    static buildSourceContainers(room: string): void {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let anchor = schema.main.anchor;
        let roomAnchor = new RoomPosition(anchor.x, anchor.y, room);
        //build paths from the roomAchor to the sources then build containers at the final step in that path
        let closest = [];
        for (let source of Game.rooms[room].find(FIND_SOURCES)) {
            let pathToSource = roomAnchor.findPathTo(source.pos, {range: 1, ignoreCreeps: true})
            let closestPosition = new RoomPosition(pathToSource[pathToSource.length - 1]["x"], pathToSource[pathToSource.length - 1]["y"], room);
            closest.push(closestPosition);
        }
        for (let close of closest) {
            close.createConstructionSite(STRUCTURE_CONTAINER);
        }
    }

    /**
     * Method to build roads to sources and controller
     * @param {String} room string representing the room
     */
     static buildPaths(room: string): void {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let liveRoom = Game.rooms[room];
        let pathSchema = schema.paths;
        let paths = [pathSchema.controller]
        for (let source in pathSchema.sources) {
            paths.push(pathSchema.sources[source as Id<Source>]);
        }
        //build all roads of all paths
        for (let path of paths) {
            for (let pos of path) {
                liveRoom.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
            }
        }
    }

    /**
     * One time room setup
     */
    static plan(room: string): RoomSchematic {
        let viz = new RoomVisual(room);
        let roomObj = Game.rooms[room];
        let controller = roomObj.controller;

        if (roomObj === undefined || controller === undefined) {
            throw new Error("Room not in vision or lacks controller");
        }

        Architect.cleanup(roomObj);

        let distanceMatrix = Architect.distanceTransform(room);
        let centroid = Architect.calculateCentroid(roomObj, controller);

        //try seven different places
        for (let p = 0; p < 7; p++) {
            let mainStamp = Architect.placeMain(centroid, distanceMatrix);
            try {
                let bothPaths = Architect.path(roomObj, controller, mainStamp.anchor);
                let paths = bothPaths[0];
                let flatPaths = bothPaths[1];
                let sources = roomObj.find(FIND_SOURCES);
                let mineral = roomObj.find(FIND_MINERALS)[0];
                // Create a cost matrix to hold the locations of things we don't want to build over
                let costMatrix = new PathFinder.CostMatrix();
                for (let x = 0; x < 50; x++) {
                    for (let y = 0; y < 50; y++) {
                        //add walls onto cost matrix
                        if (distanceMatrix.get(x, y) == 0) {
                            costMatrix.set(x, y, 255);
                            continue;
                        }

                        //add main stamp onto cost matrix
                        for (let i = -1; i < 4; i++) {
                            for (let j = -1; j < 4; j++) {
                                if (mainStamp.anchor.x + i === x && mainStamp.anchor.y + j === y) {
                                    costMatrix.set(x, y, 255);
                                }
                            }
                        }

                        //add souorces and minerals
                        for (let i = -1; i < 2; i++) {
                            for (let j = -1; j < 2; j++) {
                                for (let s of sources) {
                                    if (s.pos.x + i === x && s.pos.y + j === y) {
                                        costMatrix.set(x, y, 255);
                                    }
                                }
                                if (mineral.pos.x + i === x && mineral.pos.y + j === y) {
                                    costMatrix.set(x, y, 255);
                                }
                            }
                        }

                        for (let p of flatPaths) {
                            if (p.x === x && p.y === y) {
                                costMatrix.set(x, y, 255);
                                break;
                            }
                        }
                    }
                }
                let center = new RoomPosition(mainStamp.anchor.x + 1, mainStamp.anchor.y + 1, room);
                let extensionStamps = Architect.placeExtensions(center, costMatrix);
                //add extensions onto cost matrix
                for (let stamp of extensionStamps) {
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            costMatrix.set(stamp.anchor.x + i, stamp.anchor.y + j, 255);
                        }
                    }
                }

                let labStamp = Architect.placeLabs(center, costMatrix);
                //add lab stamp onto cost matrix
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        costMatrix.set(labStamp.anchor.x + i, labStamp.anchor.y + j, 255);
                    }
                }

                let towerStamp = Architect.placeTowers(center, costMatrix);
                //add lab stamp onto cost matrix
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        costMatrix.set(towerStamp.anchor.x + i, towerStamp.anchor.y + j, 255);
                    }
                }

                let spawnPositions = Architect.placeSpawns(center, costMatrix);

                //visualizations
                viz.rect(towerStamp.anchor.x - 0.5, towerStamp.anchor.y - 0.5, 3, 3, {'fill':'red'});
                viz.rect(labStamp.anchor.x - 0.5, labStamp.anchor.y - 0.5, 4, 4, {'fill':'green'});
                viz.rect(mainStamp.anchor.x - 0.5, mainStamp.anchor.y - 0.5, 3, 3, {'fill':'blue'});
                for (let p of flatPaths) {
                    viz.circle(p.x, p.y, {'radius': 0.25});
                }
                for (let p of spawnPositions) {
                    viz.circle(p.x, p.y, {'radius': 0.9, 'fill': 'purple'});
                }
                for (let pos of extensionStamps) {
                    viz.rect(pos.anchor.x-0.4, pos.anchor.y-0.4, 2.9, 2.9, {'fill':'yellow'})
                }

                let schematic: RoomSchematic = {
                    'main': mainStamp,
                    'extensions': extensionStamps,
                    'towers': towerStamp,
                    'labs': labStamp,
                    'spawns': spawnPositions,
                    'paths': paths
                }
                return schematic;
            } catch (e) {
                //if the room planning fails, force the mainstamp to be created somewhere else
                for (let x = -5; x < 6; x++) {
                    for (let y = -5; y < 6; y++) {
                        let cost = distanceMatrix.get(mainStamp.anchor.x + 1 + x, mainStamp.anchor.y + 1 + y);
                        if (cost <= 1) continue;
                        distanceMatrix.set(mainStamp.anchor.x + 1 + x, mainStamp.anchor.y + 1 + y, 1);
                    }
                }
            }
        }
        throw new Error("Room is not viable");
    }

    /**
     * Logic to place the main stamp along with rotation
     */
    static placeMain(centroid: Position, distanceMatrix: CostMatrix): StampPlacement {
        //figure out anchor
        let candidates = [];
        for (let x = 2; x < 46; x++) {
            for (let y = 2; y < 46; y++) {
                let score = distanceMatrix.get(x, y)
                if (score >= 4) {
                    candidates.push({
                        'x': x,
                        'y': y,
                        'score': score,
                        'distance': Architect.coordinateDistance(x, y, centroid.x, centroid.y)
                    })
                }
            }
        }

        if (candidates.length == 0) {
            throw new Error("Room is not viable");
        }

        let best = candidates.sort((a, b) => (a.distance > b.distance) ? 1 : -1)[0];

        let topLeft = {
            'x': Math.max(1, best.x - 5),
            'y': Math.max(1, best.y - 5)
        }
        let topRight = {
            'x': Math.min(49, best.x + 5),
            'y': Math.max(1, best.y - 5)
        }
        let botLeft = {
            'x': Math.max(1, best.x - 5),
            'y': Math.min(49, best.y + 5)
        }
        let botRight = {
            'x': Math.min(49, best.x + 5),
            'y': Math.min(49, best.y + 5)
        }

        //figure out rotation
        let corners = [topLeft, topRight, botLeft, botRight];
        let scores = [];

        for (let n = 0; n < corners.length; n++) {
            scores[n] = 0;
            for (let i = Math.max(1, corners[n].x - 5); i < Math.min(49, corners[n].x + 5); i++) {
                for (let j = Math.max(1, corners[n].y - 5); j < Math.min(49, corners[n].y + 5); j++) {
                    scores[n] += distanceMatrix.get(i, j);
                }
            }
        }
        let rotations = scores.indexOf(Math.max(...scores));

        return {
            'anchor': {
                x: best.x - 1,
                y: best.y - 1
            },
            'rotations': rotations
        }
    }

    /**
     * Function to path to important positions in the room to ensure that no key element is blocked off
     * @param mainStampLocation
     */
    static path(roomObj: Room, controller: StructureController, mainStampLocation: Position): [RoomPaths, Position[]] {
        let pathPositions: RoomPaths = {
            'sources': {},
            'controller': [],
            'exits': {},
            'mineral': []
        }
        let flatPaths = []
        let mainRP = new RoomPosition(mainStampLocation.x, mainStampLocation.y, roomObj.name);

        let sources = roomObj.find(FIND_SOURCES);
        for (let s of sources) {
            let sPath = roomObj.findPath(mainRP, s.pos, {'range': 1});
            let sArray = [];
            for (let p of sPath) {
                sArray.push({'x': p.x, 'y': p.y});
            }
            flatPaths.push(...sArray);
            pathPositions['sources'][s.id] = sArray;
        }

        let cPath = roomObj.findPath(mainRP, controller.pos, {'range': 1});
        let cArray = [];
        for (let p of cPath) {
            cArray.push({'x': p.x, 'y': p.y});
        }
        flatPaths.push(...cArray);
        pathPositions['controller'] = cArray;

        let exits = [FIND_EXIT_BOTTOM, FIND_EXIT_LEFT, FIND_EXIT_RIGHT, FIND_EXIT_TOP]

        for (let exit of exits) {
            let exitPos = roomObj.find(exit);
            if (exitPos.length == 0) continue;
            let middle = exitPos[Math.floor((exitPos.length - 1) / 2)];
            let ePath = roomObj.findPath(mainRP, middle, {'range': 1});
            let eArray = [];
            for (let p of ePath) {
                eArray.push({'x': p.x, 'y': p.y});
            }
            pathPositions['exits'][exit] = eArray;
            flatPaths.push(...eArray);

        }

        let mineralPos = roomObj.find(FIND_MINERALS);
        let mPath = roomObj.findPath(mainRP, mineralPos[0].pos, {'range': 1});
        let mArray = [];
        for (let p of mPath) {
            mArray.push({'x': p.x, 'y': p.y});
        }
        pathPositions['mineral'] = mArray;
        flatPaths.push(...mArray);

        return [pathPositions, flatPaths];

    }

    /**
     * Function to place all extension stamps
     * @param roomObj
     * @param controller
     * @param mainStampLocation
     * @param paths
     */
    static placeExtensions(center: RoomPosition, costMatrix: CostMatrix): StampPlacement[] {
        let clonedMatrix = costMatrix.clone();
        let extensionStamps: StampPlacement[] = [];
        //find all 3x3 squares that we can fit extensions stamps into, then cluster them by seperations
        let clusters = [0];
        for (let x = Math.max(1, center.x - 12); x < Math.min(49, center.x + 12); x++) {
            for (let y = Math.max(1, center.y - 12); y < Math.min(49, center.y + 12); y++) {
                let viable = true;
                let isNew = true;
                let cluster = -1;
                for (let i = 0; i < 3; i++){
                    if (!viable) break;
                    for (let j = 0; j < 3; j++) {
                        let cost = clonedMatrix.get(x + i, y + j);
                        if (cost > 10) {
                            viable = false;
                            break;
                        }
                        if (cost > 0) {
                            isNew = false;
                            cluster = cost;
                        }
                    }
                }
                if (!viable) continue;
                if (isNew) {
                    cluster = clusters[clusters.length - 1] + 1;
                    clusters.push(cluster);
                }
                for (let i = 0; i < 3; i++){
                    for (let j = 0; j < 3; j++) {
                        clonedMatrix.set(x + i, y + j, cluster)
                    }
                }
            }
        }

        type Mapper = {[cluster: string]: string[]};
        //final pass to merge any touching clusters
        let mapper: Mapper = {};
        for (let x = Math.max(1, center.x - 12); x < Math.min(49, center.x + 12); x++) {
            for (let y = Math.max(1, center.y - 12); y < Math.min(49, center.y + 12); y++) {
                let currentValue = clonedMatrix.get(x, y);
                if (currentValue === 255 || currentValue === 0) continue;
                let dq = false;
                let replaceValue;
                for (let j = -1; j < 2; j++) {
                    let adjacentValue = clonedMatrix.get(x + 1, y + j);
                    if (adjacentValue === 255) {
                        dq = true;
                    }
                    if (adjacentValue !== 0 && adjacentValue !== 255 && adjacentValue !== currentValue) {
                        replaceValue = adjacentValue;
                    }
                }
                if (!dq && replaceValue !== undefined) {
                    if (mapper[currentValue] == undefined) {
                        mapper[currentValue] = [];
                    }
                    mapper[currentValue].push(String(replaceValue));
                    mapper[currentValue] = _.uniq(mapper[currentValue])
                }
            }
        }

        function reduceMapper(mapper: Mapper): Mapper {
            for (let cluster of Object.keys(mapper)) {
                let mapped = mapper[cluster];

                for (let i in mapped) {
                    if (mapped[i] in mapper) {
                        mapped.push(...mapper[mapped[i]]);
                        delete mapper[mapped[i]]
                        mapper[cluster] = _.uniq(mapped);
                        return reduceMapper(mapper);
                    }
                }
            }

            return mapper;
        }

        mapper = reduceMapper(mapper);

        //clean Architect up ugh
        let newMapper: {[cluster: string]: number} = {};
        for (let cluster of Object.keys(mapper)) {
            let mapped = mapper[cluster];

            for (let i in mapped) {
                newMapper[mapped[i]] = parseInt(cluster);
            }
        }

        let clusterData: {[cluster: number]: {'cluster': number, 'size': number, 'anchor': Position}} = {};
        for (let x = Math.max(1, center.x - 15); x < Math.min(49, center.x + 15); x++) {
            for (let y = Math.max(1, center.y - 15); y < Math.min(49, center.y + 15); y++) {
                let currentValue = clonedMatrix.get(x, y);
                if (currentValue === 0 || currentValue === 255) continue;
                if (currentValue in newMapper) {
                    clonedMatrix.set(x, y, newMapper[currentValue]);
                }
                currentValue = clonedMatrix.get(x, y);
                if (!(currentValue in clusterData)) {
                    clusterData[currentValue] = {
                        'cluster': currentValue,
                        'size': 0,
                        'anchor': {'x': x, 'y': y}
                    };
                }
                clusterData[currentValue].size++;
                let colors = ['', 'red', 'orange', 'yellow', 'blue', 'green', 'purple', 'white', 'brown', 'black']
                // vis.circle(x, y, {'fill': colors[clonedMatrix.get(x, y)]})
            }
        }

        //now we have a clear cut set of clusters we can build extensions in
        //sort by largest and place extensions until 10 are placed

        let clusterDataArr = Object.values(clusterData);
        let viableSpots: StampPlacement[][]= [];
        clusterDataArr.sort((a, b) => (a.size < b.size) ? 1 : -1);
        let tree: StampPlacement[] = [];
        for (let cluster of clusterDataArr.slice(0, 2)) {
            viableSpots.push([]);
            let start = {
                'anchor': cluster.anchor,
                'rotations': 1
            };

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    clonedMatrix.set(start.anchor.x + i, start.anchor.y + j, 254);
                }
            }

            viableSpots[viableSpots.length - 1].push(start);
            tree.push(start);
            while (tree.length > 0) {
                let current = tree.shift();
                if (current === undefined) break;
                let opposite = 1 - current.rotations;
                let right = {'anchor': {'x': current.anchor.x + 3, 'y': current.anchor.y}, 'rotations': opposite};
                let bottom = {'anchor': {'x': current.anchor.x, 'y': current.anchor.y + 3}, 'rotations': opposite};
                let top = {'anchor': {'x': current.anchor.x, 'y': current.anchor.y - 3}, 'rotations': opposite};
                let candidates = [top, bottom, right];

                for (let candidate of candidates) {
                    let dq = false;
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            let cost = clonedMatrix.get(candidate.anchor.x + i, candidate.anchor.y + j);
                            if (cost !== cluster.cluster) dq = true;
                        }
                    }
                    if (!dq) {
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                clonedMatrix.set(candidate.anchor.x + i, candidate.anchor.y + j, 254);
                            }
                        }
                        viableSpots[viableSpots.length - 1].push(candidate);
                        tree.push(candidate);
                    }
                }
            }
        }
        let numSpots = 0;
        for (let v of viableSpots) {
            numSpots += v.length;
        }
        if (numSpots < 10) {
            throw new Error("Room is not viable");
        }

        //take all the stamps in the first cluster
        extensionStamps.push(...viableSpots[0]);
        //sort all the stamps from the second cluster and then add them all
        viableSpots[1].sort((a, b) => (center.getRangeTo(a.anchor.x, a.anchor.y) > center.getRangeTo(b.anchor.x, b.anchor.y)) ? 1 : -1);
        extensionStamps.push(...viableSpots[1]);
        extensionStamps = extensionStamps.slice(0, 10)
        return extensionStamps;
    }

    /**
     * Function to place towers close to the center
     * @param center
     * @param costMatrix
     * @returns
     */
    static placeTowers(center:RoomPosition, costMatrix: CostMatrix): StampPlacement {
        let candidates = [];
        for (let x = 4; x < 44; x++) {
            for (let y = 4; y < 44; y++) {
                let dq = false;
                for (let i = -1; i < 2; i++) {
                    for (let j = -1; j < 2; j++) {
                        let score = costMatrix.get(x+i, y+j);
                        if (score == 255) {
                            dq = true;
                        }
                    }
                }
                if (!dq) {
                    candidates.push({
                        'x': x,
                        'y': y,
                        'distance': Architect.coordinateDistance(x, y, center.x, center.y)
                    })
                }
            }
        }

        if (candidates.length == 0) {
            throw new Error("Room is not viable");
        }

        let best = candidates.sort((a, b) => (a.distance > b.distance) ? 1 : -1)[0];
        let topLeft = {
            'x': best.x,
            'y': best.y
        }
        let topRight = {
            'x': best.x + 2,
            'y': best.y
        }
        let botLeft = {
            'x': best.x,
            'y': best.y + 2
        }
        let botRight = {
            'x': best.x + 2,
            'y': best.y + 2
        }
        let corners = [botLeft, topLeft, topRight, botRight];

        let rotations = 0;
        let bestDistance = 100;
        for (let i in corners) {
            let distance = center.getRangeTo(corners[i].x, corners[i].y);
            if (distance < bestDistance) {
                bestDistance = distance;
                rotations = parseInt(i);
            }
        }

        return {
            'anchor': {
                x: best.x - 1,
                y: best.y - 1
            },
            'rotations': rotations
        }
    }

    /**
     * Method to place towers
     * @param center
     * @param costMatrix
     * @returns
     */
    static placeLabs(center:RoomPosition, costMatrix: CostMatrix): StampPlacement {
        let candidates = [];
        for (let x = 4; x < 44; x++) {
            for (let y = 4; y < 44; y++) {
                let dq = false;
                for (let i = -1; i < 3; i++) {
                    for (let j = -1; j < 3; j++) {
                        let score = costMatrix.get(x+i, y+j);
                        if (score == 255) {
                            dq = true;
                        }
                    }
                }
                if (!dq) {
                    candidates.push({
                        'x': x,
                        'y': y,
                        'distance': Architect.coordinateDistance(x, y, center.x, center.y)
                    })
                }
            }
        }

        if (candidates.length == 0) {
            throw new Error("Room is not viable");
        }

        let best = candidates.sort((a, b) => (a.distance > b.distance) ? 1 : -1)[0];
        let topLeft = {
            'x': best.x,
            'y': best.y
        }
        let topRight = {
            'x': best.x + 2,
            'y': best.y
        }
        let botLeft = {
            'x': best.x,
            'y': best.y + 2
        }
        let botRight = {
            'x': best.x + 2,
            'y': best.y + 2
        }
        let corners = [[botLeft, topRight], [topLeft, botRight]];

        let rotations = 0;
        let bestDistance = 100;
        for (let i in corners) {
            for (let corn of corners[i]) {
                let distance = center.getRangeTo(corn.x, corn.y);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    rotations = parseInt(i);
                }
            }
        }
        return {
            'anchor': {
                x: best.x - 1,
                y: best.y - 1
            },
            'rotations': rotations
        }
    }

    static placeSpawns(center:RoomPosition, costMatrix: CostMatrix): Position[] {
        let candidates: Position[] = [];
        for (let x = -6; x < 7; x++) {
            for (let y = -6; y < 7; y++) {
                if (costMatrix.get(center.x + x, center.y + y) < 255) {
                    candidates.push({'x': center.x + x, 'y': center.y + y})
                }
            }
        }
        if (candidates.length < 3) throw new Error("Room is not viable");
        candidates.sort((a, b) => (center.getRangeTo(a.x, a.y) > center.getRangeTo(b.x, b.y)) ? 1 : -1);
        return candidates.slice(0, 3);
    }

    /**
     * Mathod to clear out any left over junk from previous inhabitants
     * @param roomObj
     */
    static cleanup(roomObj: Room) {
        let enemyBuildings = roomObj.find(FIND_STRUCTURES, {
            filter: (struc) => {return struc.structureType != STRUCTURE_STORAGE && struc.structureType != STRUCTURE_TERMINAL}
        }) as OwnedStructure[];
        for (let struct of enemyBuildings) {
            if (struct.my === true) continue;
            struct.destroy();
        }
    }

    /**
     * Method to find the centroid of the controller and sources
     * @param roomObj
     * @param controller
     * @returns
     */
    static calculateCentroid(roomObj: Room, controller: StructureController): Position {
        //find all the things we want to be close to
        let POVs = [];
        let sources = roomObj.find(FIND_SOURCES);
        for (let source of sources) {
            POVs.push(source.pos);
        }
        POVs.push(controller.pos);

        //centroid calculation
        let centroid = {
            "x": 0,
            "y": 0
        };
        for (let pov of POVs) {
            centroid["x"] += pov.x;
            centroid["y"] += pov.y;
        }
        centroid["x"] = Math.floor(centroid["x"] / POVs.length);
        centroid["y"] = Math.floor(centroid["y"] / POVs.length);
        return centroid;
    }

    /**
     * Distance transform
     * @returns CostMatrix of distances from nearest wall
     */
    static distanceTransform(room: string): CostMatrix {
        let vis = new RoomVisual(room);

        let topDownPass = new PathFinder.CostMatrix();
        let roomTerrain = Game.map.getRoomTerrain(room);

        for (let y = 0; y < 50; ++y) {
            for (let x = 0; x < 50; ++x) {
                if (roomTerrain.get(x, y) == TERRAIN_MASK_WALL) {
                    topDownPass.set(x, y, 0);
                }
                else {
                    topDownPass.set(x, y,
                        Math.min(topDownPass.get(x-1, y-1), topDownPass.get(x, y-1),
                            topDownPass.get(x+1, y-1), topDownPass.get(x-1, y)) + 1);
                }
            }
        }

        for (let y = 49; y >= 0; --y) {
            for (let x = 49; x >= 0; --x) {
                let value = Math.min(topDownPass.get(x, y),
                        topDownPass.get(x+1, y+1) + 1, topDownPass.get(x, y+1) + 1,
                        topDownPass.get(x-1, y+1) + 1, topDownPass.get(x+1, y) + 1);
                topDownPass.set(x, y, value);
            }
        }

        return topDownPass;
    }

    /**
     * Function to calculate distance between two points
     * @param x
     * @param y
     * @param x1
     * @param y1
     * @returns
     */
    static coordinateDistance(x: number, y: number, x1: number, y1: number) {
        let dx = x1 - x;
        let dy = y1 - y;
        return Math.sqrt(dx*dx + dy*dy)
    }

    static clearSites(room: string) {
        for (let site in Game.constructionSites){
            let cSite = Game.constructionSites[site];
            if (cSite.pos.roomName === room) {
                cSite.remove();
            }
        }
    }
}
