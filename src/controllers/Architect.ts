import Castrum from "castrum/Castrum";
import Chronicler from "./Chronicler";
import Informant from "./Informant";

/**
 * Stamps. Can be rotated
 */
const STAMP_MAIN: Stamp = [
    [STRUCTURE_STORAGE, STRUCTURE_ROAD, STRUCTURE_TERMINAL],
    [STRUCTURE_NUKER, STRUCTURE_ROAD, STRUCTURE_POWER_SPAWN],
    [STRUCTURE_LINK, STRUCTURE_OBSERVER, STRUCTURE_FACTORY]

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
        this.buildNexus(room);
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
        let stop = false;
        for (let stamp of schema.extensions) {
            if (stop === true) return;
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
                    if (numExtensions <= 0) stop = true;
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
                if (building === STRUCTURE_LINK && Chronicler.readGameStage(room) >= 8) {

                }
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

        if (!buildRoads) return;

        //build roads surrounding the main stamp
        let nearY = stamp.anchor.y - 1;
        let nearX = stamp.anchor.x - 1;
        let farX = stamp.anchor.x + 3;
        let farY = stamp.anchor.y + 3;
        for (let x = -1; x < 4; x++) {
            for (let y = -1; y < 4; y++) {
                let pos = new RoomPosition(stamp.anchor.x + x, stamp.anchor.y + y, room);
                if (pos.x === nearX || pos.x === farX || pos.y === nearY || pos.y === farY) {
                    pos.createConstructionSite(STRUCTURE_ROAD);
                }
            }
        }
    }

    /**
     * Method to build and repair workshops
     * @param room
     */
    static buildWorkshops(room: string) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let stamp = schema.labs;
        let rotated = rotateStamp(STAMP_LAB, stamp.rotations);
        //we need to build the labs in a set order as their positions are important.
        let chosenCorner: RoomPosition;
        if (stamp.rotations % 2 === 0) {
            //even
            chosenCorner = new RoomPosition(stamp.anchor.x, stamp.anchor.y + 3, room);
        } else {
            //odd
            chosenCorner = new RoomPosition(stamp.anchor.x + 3, stamp.anchor.y + 3, room);
        }
        let positions = [];
        let dimensions = rotated.length;
        for (let x = 0; x < dimensions; x++) {
            for (let y = 0; y < dimensions; y++) {
                positions.push(new RoomPosition(stamp.anchor.x + x, stamp.anchor.y + y, room));
            }
        }
        //sort by distance to chosenCorner
        positions = positions.sort((a,b) => a.getRangeTo(chosenCorner) - b.getRangeTo(chosenCorner));

        for (let pos of positions) {
            let building = rotated[pos.x-stamp.anchor.x][pos.y-stamp.anchor.y];
            pos.createConstructionSite(building);
        }
    }

    /**
     * Method to build and repair workshops
     * @param room
     */
     static buildNexus(room: string) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let spots = schema.spawns;
        for (let spot of spots) {
            new RoomPosition(spot.x, spot.y, room).createConstructionSite(STRUCTURE_SPAWN);
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
        let sourceData = schema.resources.sources;

        for (let source in sourceData) {
            let pos = sourceData[source as Id<Source>].containerPos
            let lastRoomPos = new RoomPosition(pos.x, pos.y, room);
            lastRoomPos.createConstructionSite(STRUCTURE_CONTAINER);
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
     * Method to build the controller link
     * @param {String} room string representing the room
     */
    static buildControllerLink(room: string): void {
        //get anchor
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let path = schema.paths.controller;
        let lastPos = path[path.length - 1];
        let linkRoomPos = new RoomPosition(lastPos.x, lastPos.y, room);
        linkRoomPos.createConstructionSite(STRUCTURE_LINK);
    }

    /**
     * Method to build a link for sources
     * @param room
     */
    static buildSourceLink(room: string) {
        //get anchor
        let schema = Chronicler.readSchema(room);
        let liveRoom = Game.rooms[room];
        let controller = liveRoom.controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let main = schema.main.anchor;
        let mainPos = new RoomPosition(main.x, main.y, room);

        //find the sources and sort by distance
        let sources = liveRoom.find(FIND_SOURCES);
        sources = _.sortBy(sources, source => mainPos.getRangeTo(source)).reverse();

        //loop through sources
        for (let source of sources) {
            let sourceLink = source.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => { return structure.structureType == STRUCTURE_LINK
                    && source.pos.inRangeTo(structure, 3)
                }
            });

            if (sourceLink) continue;

            let sourceContainer = source.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => { return structure.structureType == STRUCTURE_CONTAINER
                    && source.pos.inRangeTo(structure, 3)
                }
            });

            if (sourceContainer) {
                let containerWrapper = Informant.getWrapper(sourceContainer.id) as Castrum;
                containerWrapper.decommission();
            }

            let linkPos = schema.resources.sources[source.id].linkPos;
            liveRoom.createConstructionSite(linkPos.x, linkPos.y, STRUCTURE_LINK);
        }
    }
    /**
     * Method to build all walls and ramparts
     * @param room
     */
    static buildWalls(room: string) {
        let schema = Chronicler.readSchema(room);
        let liveRoom = Game.rooms[room];
        let controller = liveRoom.controller;
        if (controller === undefined) throw Error("Room has no controller!");
        for (let pos of schema.walls) {
            liveRoom.createConstructionSite(pos.x, pos.y, STRUCTURE_WALL);
        }
        for (let pos of schema.ramparts) {
            liveRoom.createConstructionSite(pos.x, pos.y, STRUCTURE_RAMPART);
        }
    }

    /**
     * Method to build the extractor and path back to main
     * @param room
     */
    static buildExtractor(room: string) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let liveRoom = Game.rooms[room];
        let path = schema.paths.mineral;
        let lastPos = path.pop();
        if (lastPos === undefined) throw Error("No path to mineral");
        liveRoom.createConstructionSite(lastPos.x, lastPos.y, STRUCTURE_CONTAINER);
        for (let pos of path) {
            liveRoom.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
        }
        let mineralPos = liveRoom.find(FIND_MINERALS)[0].pos;
        liveRoom.createConstructionSite(mineralPos.x, mineralPos.y, STRUCTURE_EXTRACTOR);

    }

    /**
     * Method to build path from main stamp to and exit
     * @param room
     */
    static buildExitPaths(room: string, exit: ExitConstant) {
        let schema = Chronicler.readSchema(room);
        let controller = Game.rooms[room].controller;
        if (controller === undefined) throw Error("Room has no controller!");
        let liveRoom = Game.rooms[room];
        let path = schema.paths.exits[exit];

        //build all roads of all paths
        for (let pos of path) {
            liveRoom.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
        }
    }

    /**
     * Method to build roads in remote room from entrance to sources. Also builds the container
     * @param room
     */
    static buildRemotePaths(room:string, remote: string, exit: ExitConstant): RemoteSchematic | undefined {
        let remotePath = Chronicler.readSchema(room).paths.exits[exit];
        let lastPath = remotePath[remotePath.length - 1];
        let startCoords: Position

        switch (exit) {
            case TOP:
                startCoords = {
                    x: lastPath.x,
                    y: 48
                }
                break;
            case BOTTOM:
                startCoords = {
                    x: lastPath.x,
                    y: 1
                }
                break;
            case LEFT:
                startCoords = {
                    x: 48,
                    y: lastPath.y
                }
                break;
            case RIGHT:
                startCoords = {
                    x: 1,
                    y: lastPath.y
                }
                break;
        }
        let liveStart = new RoomPosition(startCoords.x, startCoords.y, remote);
        let liveRemote = Game.rooms[remote];

        if (!liveRemote || !liveStart) return;

        let schema: RemoteSchematic = {paths: [], sources: {}};
        let sources = liveRemote.find(FIND_SOURCES);
        liveStart.createConstructionSite(STRUCTURE_ROAD)
        for (let source of sources) {
            let path = liveRemote.findPath(liveStart, source.pos, {'range': 1});
            for (let step of path) {
                schema.paths.push({x: step.x, y: step.y})
                liveRemote.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
            }
            let lastStep = path[path.length - 1];
            schema.sources[source.id] = {
                containerPos: {
                    x: lastStep.x,
                    y: lastStep.y
                }
            };
            liveRemote.createConstructionSite(lastStep.x, lastStep.y, STRUCTURE_CONTAINER);
        }
        return schema;
    }

    /**
     * One time room setup
     */
    static plan(room: string): RoomSchematic {
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
            let center = new RoomPosition(mainStamp.anchor.x + 1, mainStamp.anchor.y + 1, room);
            try {
                let bothPaths = Architect.path(roomObj, controller, mainStamp.anchor);
                let paths = bothPaths[0];
                let flatPaths = bothPaths[1];
                let sources = roomObj.find(FIND_SOURCES);
                let resourcePlan: ResourcePlan = {sources:{}, mineral: {containerPos: {x:0,y:0}}};
                // Create a cost matrix to hold the locations of things we don't want to build over
                let costMatrix = new PathFinder.CostMatrix();
                for (let x = 0; x < 50; x++) {
                    for (let y = 0; y < 50; y++) {
                        //add walls onto cost matrix
                        if (distanceMatrix.get(x, y) == 0) {
                            costMatrix.set(x, y, 255);
                            continue;
                        }
                    }
                }

                //add main stamp onto cost matrix
                for (let i = -1; i < 4; i++) {
                    for (let j = -1; j < 4; j++) {
                        costMatrix.set(mainStamp.anchor.x + i, mainStamp.anchor.y + j, 200);
                    }
                }

                //set controller link
                let clPath = paths.controller;
                let clPos = clPath[clPath.length - 1];

                //add source links and container
                for (let s of sources) {
                    let sPath = paths.sources[s.id]
                    let containerPos = sPath[sPath.length - 1];

                    let linkPos: Position | undefined;
                    for (let i = -1; i < 2; i++) {
                        for (let j = -1; j < 2; j++) {
                            if (costMatrix.get(containerPos.x + i, containerPos.x + j) < 50) {
                                linkPos = {x: containerPos.x + i, y: containerPos.y + j};
                            }
                        }
                    }

                    if (linkPos === undefined) {
                        //if a position satisfying the above requirements is not found, build it on the path
                        linkPos = sPath[sPath.length - 2];
                    }
                    costMatrix.set(linkPos.x, linkPos.y, 50)
                    resourcePlan.sources[s.id] = {
                        'containerPos': containerPos,
                        'linkPos': linkPos
                    }
                }

                //set mineral containerpos
                let mPath = paths.mineral;
                let containerPos = mPath[mPath.length - 1];
                resourcePlan.mineral.containerPos = containerPos;

                //add paths to cost matrix
                let viz = new RoomVisual(room);

                for (let p of flatPaths) {
                    console.log(`${p.x},${p.y}`)
                    viz.circle(p.x, p.y, {'radius': 0.9, 'fill': 'purple'});

                    costMatrix.set(p.x, p.y, 50);
                    break;
                }

                let towerStamp = Architect.placeTowers(center, costMatrix);
                //add lab stamp onto cost matrix
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        costMatrix.set(towerStamp.anchor.x + i, towerStamp.anchor.y + j, 200);
                    }
                }

                let extensionStamps = Architect.placeExtensions(center, costMatrix);
                //add extensions onto cost matrix
                for (let stamp of extensionStamps) {
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            costMatrix.set(stamp.anchor.x + i, stamp.anchor.y + j, 200);
                        }
                    }
                }

                let labStamp = Architect.placeLabs(center, costMatrix);
                //add lab stamp onto cost matrix
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        costMatrix.set(labStamp.anchor.x + i, labStamp.anchor.y + j, 200);
                    }
                }

                let spawnPositions = Architect.placeSpawns(center, costMatrix);

               let wallPositions = Architect.placeWalls(center, costMatrix, room);

                let schematic: RoomSchematic = {
                    'main': mainStamp,
                    'extensions': extensionStamps,
                    'towers': towerStamp,
                    'labs': labStamp,
                    'spawns': spawnPositions,
                    'paths': paths,
                    'walls': wallPositions.walls,
                    'ramparts': wallPositions.ramparts,
                    'resources': resourcePlan,
                    'controllerLink': clPos,
                    'remotes': {}
                }
                return schematic;
            } catch (e) {
                //if the room planning fails, force the mainstamp to be created somewhere else
                console.log(e)
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

        let best = candidates.sort((a, b) => (a.score - (a.distance * .25) < b.score - (b.distance * .25)) ? 1 : -1)[0];

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

    static drawSchematic(room: string) {
        let schema = Chronicler.readSchema(room);
        let viz = new RoomVisual(room);

        // Stamps
        viz.rect(schema.towers.anchor.x - 0.5, schema.towers.anchor.y - 0.5, 3, 3, {'fill':'red'});
        viz.rect(schema.labs.anchor.x - 0.5, schema.labs.anchor.y - 0.5, 4, 4, {'fill':'green'});
        viz.rect(schema.main.anchor.x - 0.5, schema.main.anchor.y - 0.5, 3, 3, {'fill':'blue'});

        // Spawns
        for (let p of schema.spawns) {
            viz.circle(p.x, p.y, {'radius': 0.9, 'fill': 'purple'});
        }

        // Extension stamps
        for (let pos of schema.extensions) {
            viz.rect(pos.anchor.x-0.4, pos.anchor.y-0.4, 2.9, 2.9, {'fill':'yellow'});
        }

        // Walls and ramparts
        for (let pos of schema.walls) {
            viz.rect(pos.x - 0.5, pos.y - 0.5, 1, 1, {'fill':'white', 'stroke':'orange'});
        }
        for (let pos of schema.ramparts) {
            viz.rect(pos.x - 0.5, pos.y - 0.5, 1, 1, {'fill':'white', 'stroke':'cyan'});
        }

        // Source containers and links
        for (let sourceId in schema.resources.sources) {
            let src = schema.resources.sources[sourceId as Id<Source>];
            viz.circle(src.containerPos.x, src.containerPos.y, {'radius': 0.4, 'fill': 'orange'});
            viz.circle(src.linkPos.x, src.linkPos.y, {'radius': 0.3, 'fill': 'magenta'});
        }

        // Mineral container
        if (schema.resources.mineral.containerPos) {
            viz.circle(schema.resources.mineral.containerPos.x, schema.resources.mineral.containerPos.y, {'radius': 0.4, 'fill': 'lime'});
        }

        // Controller link
        if (schema.controllerLink) {
            viz.circle(schema.controllerLink.x, schema.controllerLink.y, {'radius': 0.3, 'fill': 'gold'});
        }

        // Paths (sources, controller, exits, mineral)
        // Draw each path as a series of line segments between consecutive points
        let drawPath = (positions: Position[], color: string) => {
            let rps = positions.map(p => new RoomPosition(p.x, p.y, room));
            for (let i = 0; i < rps.length - 1; i++) {
                viz.line(rps[i], rps[i + 1], {'color': color});
            }
        };

        drawPath(schema.paths.controller, 'white');
        for (let sourceId in schema.paths.sources) {
            drawPath(schema.paths.sources[sourceId as Id<Source>], 'orange');
        }
        for (let exitKey in schema.paths.exits) {
            drawPath(schema.paths.exits[exitKey as unknown as ExitConstant], 'cyan');
        }
        if (schema.paths.mineral.length > 0) {
            drawPath(schema.paths.mineral, 'lime');
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
        let avoidPos: RoomPosition[] = [];
        for (let s of sources) {
            let sPath = roomObj.findPath(mainRP, s.pos, {'range': 1, 'avoid': avoidPos});
            let sArray = [];
            for (let p of sPath) {
                sArray.push({'x': p.x, 'y': p.y});
            }
            let lastStep = sPath[sPath.length - 1]
            let lastPos = new RoomPosition(lastStep.x, lastStep.y, roomObj.name);
            avoidPos.push(lastPos);
            flatPaths.push(...sArray);
            pathPositions['sources'][s.id] = sArray;
        }

        let cPath = roomObj.findPath(mainRP, controller.pos, {'range': 1, 'avoid': avoidPos});
        let cArray = [];
        for (let p of cPath) {
            cArray.push({'x': p.x, 'y': p.y});
        }
        let lastStep = cPath[cPath.length - 1]
        let lastPos = new RoomPosition(lastStep.x, lastStep.y, roomObj.name);
        avoidPos.push(lastPos);
        flatPaths.push(...cArray);
        pathPositions['controller'] = cArray;

        let exits = [FIND_EXIT_BOTTOM, FIND_EXIT_LEFT, FIND_EXIT_RIGHT, FIND_EXIT_TOP]

        for (let exit of exits) {
            let exitPos = roomObj.find(exit);
            if (exitPos.length == 0) continue;
            let middle = exitPos[Math.floor((exitPos.length - 1) / 2)];
            let ePath = roomObj.findPath(mainRP, middle, {'range': 1, 'avoid': avoidPos});
            let eArray = [];
            for (let p of ePath) {
                eArray.push({'x': p.x, 'y': p.y});
            }
            pathPositions['exits'][exit] = eArray;
            flatPaths.push(...eArray);

        }

        let mineralPos = roomObj.find(FIND_MINERALS);
        let mPath = roomObj.findPath(mainRP, mineralPos[0].pos, {'range': 1, 'avoid': avoidPos});
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
        let claimed = costMatrix.clone();
        let viableSpots: StampPlacement[] = [];

        // enumerate every possible 3x3 stamp position and check if it's buildable
        for (let x = 2; x <= 47; x++) {
            for (let y = 2; y <= 47; y++) {
                let viable = true;
                for (let i = 0; i < 3 && viable; i++) {
                    for (let j = 0; j < 3 && viable; j++) {
                        let cost = claimed.get(x + i, y + j);
                        if (cost < 0 || cost > 10) viable = false;
                    }
                }
                if (!viable) continue;

                // check that this stamp doesn't overlap any previously claimed stamp
                for (let i = 0; i < 3 && viable; i++) {
                    for (let j = 0; j < 3 && viable; j++) {
                        if (claimed.get(x + i, y + j) === 254) viable = false;
                    }
                }
                if (!viable) continue;

                // checkerboard rotation: adjacent stamps (within one grid cell) get opposite rotations
                let gridX = Math.floor(x / 3);
                let gridY = Math.floor(y / 3);
                let rotations = (gridX + gridY) % 2;

                viableSpots.push({
                    anchor: { x, y },
                    rotations
                });
            }
        }
        // sort by distance from center, then greedily pick non-overlapping stamps
        viableSpots.sort((a, b) => center.getRangeTo(a.anchor.x, a.anchor.y) - center.getRangeTo(b.anchor.x, b.anchor.y));

        let selected: StampPlacement[] = [];
        for (let stamp of viableSpots) {
            if (selected.length >= 10) break;
            let overlaps = false;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (claimed.get(stamp.anchor.x + i, stamp.anchor.y + j) === 254) {
                        overlaps = true;
                        break;
                    }
                }
                if (overlaps) break;
            }
            if (overlaps) continue;
            selected.push(stamp);
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    claimed.set(stamp.anchor.x + i, stamp.anchor.y + j, 254);
                }
            }
        }

        // BFS 2-coloring: start from the stamp closest to main stamp, choose optimal rotation for it
        // then alternate outward to adjacent stamps
        selected.sort((a, b) => center.getRangeTo(a.anchor.x, a.anchor.y) - center.getRangeTo(b.anchor.x, b.anchor.y));
        let visited = new Set<number>();
        for (let i = 0; i < selected.length; i++) {
            if (visited.has(i)) continue;

            // choose rotation for the first stamp in each connected component
            // based on which corner of the stamp is closest to the main stamp center
            let dx = center.x - (selected[i].anchor.x + 1);
            let dy = center.y - (selected[i].anchor.y + 1);
            let absDx = Math.abs(dx);
            let absDy = Math.abs(dy);
            // rotation 0: roads at top-right and bottom-left corners
            // rotation 1: roads at top-left and bottom-right corners
            // pick rotation whose road corner is closer to the main stamp
            let rotation0Score = absDx + absDy; // Manhattan distance (higher = worse)
            // rotation 0 has roads in quadrants: (dx < 0, dy > 0) and (dx > 0, dy < 0)
            // rotation 1 has roads in quadrants: (dx < 0, dy < 0) and (dx > 0, dy > 0)
            let rot0Matches = 0;
            if ((dx < 0 && dy > 0) || (dx > 0 && dy < 0)) rot0Matches++;
            let rot1Matches = 0;
            if ((dx < 0 && dy < 0) || (dx > 0 && dy > 0)) rot1Matches++;
            selected[i].rotations = rot1Matches >= rot0Matches ? 1 : 0;

            visited.add(i);
            let queue: number[] = [i];
            while (queue.length > 0) {
                let idx = queue.shift()!;
                for (let j = 0; j < selected.length; j++) {
                    if (visited.has(j)) continue;
                    let gridDx = Math.round(selected[idx].anchor.x / 3) - Math.round(selected[j].anchor.x / 3);
                    let gridDy = Math.round(selected[idx].anchor.y / 3) - Math.round(selected[j].anchor.y / 3);
                    if (Math.abs(gridDx) === 1 && gridDy === 0 || gridDx === 0 && Math.abs(gridDy) === 1) {
                        selected[j].rotations = (selected[idx].rotations + 1) % 2;
                        visited.add(j);
                        queue.push(j);
                    }
                }
            }
        }

        if (selected.length < 9) {
            throw new Error("Room is not viable");
        }

        return selected;
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
                        if (score > 0) {
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
                        if (score > 0) {
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
                if (costMatrix.get(center.x + x, center.y + y) === 0) {
                    candidates.push({'x': center.x + x, 'y': center.y + y})
                }
            }
        }
        if (candidates.length < 3) throw new Error("Room is not viable");
        candidates.sort((a, b) => (center.getRangeTo(a.x, a.y) > center.getRangeTo(b.x, b.y)) ? 1 : -1);
        return candidates.slice(0, 3);
    }

   /**
      * Method to find mincut walls using max-flow.
      * Finds the minimum set of cells to block that disconnect all exits from the base area.
      * @param room
      */
    static placeWalls(center: RoomPosition, costMatrix: CostMatrix, roomName: string): {walls: Array<Position>, ramparts: Array<Position>} {
    // ── Step 1: Define source (core layout) and sink (real exits) ──

    // Base cells: the 11x11 core area around center + structure tiles (cost 200)
    let baseCells: string[] = [];
    for (let x = Math.max(2, center.x - 5); x <= Math.min(47, center.x + 5); x++) {
        for (let y = Math.max(2, center.y - 5); y <= Math.min(47, center.y + 5); y++) {
            if (costMatrix.get(x, y) !== 255) {
                baseCells.push(`${x},${y}`);
            }
        }
    }
    // Also include structure tiles (cost 200) as base seeds
    for (let x = 2; x < 48; x++) {
        for (let y = 2; y < 48; y++) {
            if (costMatrix.get(x, y) === 200) {
                baseCells.push(`${x},${y}`);
            }
        }
    }

    // Exit zone: cells within 1 tile of any actual exit tile
    let exitZone = new Set<string>();
    let roomObj = Game.rooms[roomName];
    if (roomObj) {
        const exits = [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT] as const;
        for (const exitType of exits) {
            for (const tile of roomObj.find(exitType)) {
                const tx = (tile as RoomPosition).x;
                const ty = (tile as RoomPosition).y;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = tx + dx, ny = ty + dy;
                        if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                            exitZone.add(`${nx},${ny}`);
                        }
                    }
                }
            }
        }
    }

    // ── Step 2: BFS from base (8-dir) and from exits (8-dir) ──
    function bfs8(seeds: string[]): Set<string> {
        let visited = new Set<string>();
        let q: string[] = [];
        for (const s of seeds) { visited.add(s); q.push(s); }
        while (q.length > 0) {
            const [cx, cy] = q.shift()!.split(',').map(Number);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (!dx && !dy) continue;
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || nx >= 50 || ny < 0 || ny >= 50) continue;
                    if (costMatrix.get(nx, ny) === 255) continue;
                    const key = `${nx},${ny}`;
                    if (visited.has(key)) continue;
                    visited.add(key);
                    q.push(key);
                }
            }
        }
        return visited;
    }

    let fromBase = bfs8(baseCells);
    let fromExit = bfs8(Array.from(exitZone));

    // ── Step 3: Relevant cells = intersection, excluding border ──
    let relevantCells: string[] = [];
    let cellToIndex = new Map<string, number>();
    for (const cell of fromBase) {
        if (fromExit.has(cell)) {
            const [cx, cy] = cell.split(',').map(Number);
            if (cx <= 1 || cx >= 48 || cy <= 1 || cy >= 48) continue;
            cellToIndex.set(cell, relevantCells.length);
            relevantCells.push(cell);
        }
    }
    if (relevantCells.length === 0) return { walls: [], ramparts: [] };

    let N = relevantCells.length;
    let SRC = 2 * N, SNK = 2 * N + 1;
    let NUM_NODES = 2 * N + 2;
    let adj: {v: number; cap: number; rev: number}[][] = Array.from({length: NUM_NODES}, () => []);
    function addEdge(u: number, v: number, cap: number) {
        adj[u].push({v, cap, rev: adj[v].length});
        adj[v].push({v: u, cap: 0, rev: adj[u].length - 1});
    }

    // ── Step 4: Node splitting (entry capacity) ──
    for (let i = 0; i < N; i++) {
        const [cx, cy] = relevantCells[i].split(',').map(Number);
        // Weight 1e9 for structure tiles or cells near structures (2-tile safety zone)
        let nearStructure = costMatrix.get(cx, cy) === 200;
        if (!nearStructure) {
            for (let dx = -2; dx <= 2 && !nearStructure; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50 && costMatrix.get(nx, ny) === 200) {
                        nearStructure = true;
                    }
                }
            }
        }
        addEdge(i, i + N, nearStructure ? 1e9 : 1);
    }

    // ── Step 5: Adjacency edges (8-dir, infinite capacity) + sink connections ──
    for (let i = 0; i < N; i++) {
        const [cx, cy] = relevantCells[i].split(',').map(Number);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (!dx && !dy) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= 50 || ny < 0 || ny >= 50) continue;
                const nKey = `${nx},${ny}`;
                if (cellToIndex.has(nKey)) {
                    addEdge(i + N, cellToIndex.get(nKey)!, 1e9);
                } else if (exitZone.has(nKey)) {
                    addEdge(i + N, SNK, 1e9);
                }
            }
        }
    }

    // ── Step 6: Super-source edges ──
    for (const bc of baseCells) {
        if (cellToIndex.has(bc)) {
            addEdge(SRC, cellToIndex.get(bc)!, 1e9);
        }
    }

    // ── Step 7: Edmonds-Karp max-flow ──
    let maxFlow = 0;
    while (true) {
        const parent = new Array(NUM_NODES).fill(-1);
        const edgeIdx = new Array(NUM_NODES).fill(-1);
        const visited = new Uint8Array(NUM_NODES);
        const q = [SRC];
        visited[SRC] = 1;
        let found = false;
        while (q.length > 0) {
            const u = q.shift()!;
            for (let e = 0; e < adj[u].length; e++) {
                const edge = adj[u][e];
                if (!visited[edge.v] && edge.cap > 0) {
                    visited[edge.v] = 1;
                    parent[edge.v] = u;
                    edgeIdx[edge.v] = e;
                    if (edge.v === SNK) { found = true; break; }
                    q.push(edge.v);
                }
            }
            if (found) break;
        }
        if (parent[SNK] === -1) break;

        let bottleneck = 1e9;
        for (let v = SNK; v !== SRC; v = parent[v]!) {
            bottleneck = Math.min(bottleneck, adj[parent[v]]![edgeIdx[v]]!.cap);
        }
        for (let v = SNK; v !== SRC; v = parent[v]!) {
            const u = parent[v]!, e = edgeIdx[v]!;
            adj[u][e].cap -= bottleneck;
            adj[v][adj[u][e].rev].cap += bottleneck;
        }
        maxFlow += bottleneck;
    }

    // ── Step 8: Min-cut = reachable nodes in residual graph ──
    const reachable = new Uint8Array(NUM_NODES);
    const q = [SRC];
    reachable[SRC] = 1;
    while (q.length > 0) {
        const u = q.shift()!;
        for (const edge of adj[u]) {
            if (!reachable[edge.v] && edge.cap > 0) {
                reachable[edge.v] = 1;
                q.push(edge.v);
            }
        }
    }

    let walls: Position[] = [];
    let ramparts: Position[] = [];
    for (let i = 0; i < N; i++) {
        if (reachable[i] && !reachable[i + N]) {
            const [cx, cy] = relevantCells[i].split(',').map(Number);
            // Road/path cells (cost 50) become ramparts; everything else becomes walls
            if (costMatrix.get(cx, cy) === 50) {
                ramparts.push({x: cx, y: cy});
            } else {
                walls.push({x: cx, y: cy});
            }
        }
    }

    return { walls, ramparts };
}

    /**
     * Mathod to clear out any left over junk from previous inhabitants
     * @param roomObj
     */
    static cleanup(roomObj: Room) {
        let enemyBuildings = roomObj.find(FIND_STRUCTURES, {
            filter: (struc) => {return struc.structureType !== STRUCTURE_STORAGE &&
                struc.structureType !== STRUCTURE_TERMINAL &&
                struc.structureType !== STRUCTURE_NUKER}
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

    static terrainMatrix(room: string) {
        let matrix = new PathFinder.CostMatrix;
        let roomTerrain = Game.rooms[room].getTerrain();
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                if (roomTerrain.get(x, y) === TERRAIN_MASK_WALL) {
                    matrix.set(x, y, 0xff);
                }
            }
        }

        return matrix;
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
