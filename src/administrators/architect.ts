import { Archivist } from "./archivist";
import { Informant } from "./informant";

export class Architect {
    //entity for room planning

    /**
     * Method to calculate the gamestage, should be run occasionally to check for certain game events
     * @param {String} room String representing the room
     * @returns an integer representing the game stage
     */
    static calculateGameStage(room: string): string {
        let liveRoom = Game.rooms[room];
        if (liveRoom === undefined || liveRoom.controller === undefined) return '-1';
        let supervisor = global.Imperator.administrators[room].supervisor;
        let rcl = liveRoom.controller.level;
        let currentStage = Archivist.getGameStage(room);
        let calculation = "-1"; //hopefully never calculation = s this

        if (rcl == 1) {
            //activate phase 1
            calculation = "1";
        }
        if (rcl == 2) {
            //nothing special happens
            calculation = "2";
        }
        if (rcl == 3) {
            //nothing special
            calculation = "3";
        }
        if (rcl == 3 && supervisor.castrum.bastion.length > 0) {
            //tower is built, time to build containers
            calculation = "3.1";
        }
        if (rcl == 4) {
            //nothing special
            calculation = "4";
        }
        if (rcl == 4 && liveRoom.storage && liveRoom.storage.my) {
            //storage is built, time to switch to phase 2
            calculation = "4.1";
        }
        if (rcl == 4 && liveRoom.storage && liveRoom.storage.my && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 100000) {
            //storage is built, has 100,000 energy. time to build bunker roads
            calculation = "4.2";
        }
        if (rcl == 4 && currentStage == "4.2" && liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            //bunker roads are built, build roads to sources
            calculation = "4.3";
        }
        if (rcl == 5) {
            //links are available, time to build controller link and storage link
            calculation = "5";
        }
        if (rcl == 6) {
            //rcl 6 has lots of expensive stuff to build
            calculation = "6";
        }
        if (rcl == 6 && currentStage == "6" && liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            //lots of expensive stuff is done building, time to build one source link
            calculation = "6.1";
        }
        if (rcl == 6 && currentStage == "6.1" && liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            //build excavator and roads to it
            calculation = "6.2";
        }
        if (rcl == 6 && currentStage == "6.2" && liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            //time to start scouting and spawn the excavator
            calculation = "6.3";
        }
        if (rcl == 6 && currentStage == "6.3" && Archivist.getDoneScouting(room) == true) {
            //time to build road to the remote
            calculation = "6.4";
        }
        if (rcl == 6 && currentStage == "6.4" && liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            //time to build the insides of the remote and miners
            calculation = "6.5";
        }
        if (rcl == 7) {
            //build second source link
            calculation = "7";
        }
        if (rcl == 7 && currentStage == "7" && liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length == 0
            && liveRoom.storage && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 100000) {
                //start chemical productions
                calculation = "7.1";
        }
        if (rcl == 8) {
            //todo: lots
            calculation = "8";
        }

        return calculation;
    }

    /**
     * Function to do room planning whenever gamestage changes
     * @param {String} room string representation of a room
     */
    static design(room: string, gameStage: string) {
        switch (gameStage) {
            case "1":
                //calculate anchor and build spawn
                Architect.buildBunker(room);
                if (Game.rooms[room].find(FIND_MY_SPAWNS).length > 0) {
                    //start the room off with the five basic engineers
                    global.Imperator.administrators[room].executive.phaseOne();
                }
                break;
            case "2":
                //turning rcl 2
                Architect.buildBunker(room);

                break;
            case "3":
                //turning rcl 3
                //build the first few extensions
                Architect.buildBunker(room);
                break;
            case "3.1":
                //towers are built, so build containers at sources
                Architect.buildSourceContainers(room);
                //activate phaseOne at gamestage 3.1 if this isn't the first room
                if (global.Imperator.dominion.length > 1) {
                    global.Imperator.administrators[room].executive.phaseOne();
                }
                break;
            case "4":
                //just turned rcl 4
                Architect.buildBunker(room);
                break;
            case "4.1":
                //storage is built, time to switch to phase two
                global.Imperator.administrators[room].executive.phaseTwo();
                break;
            case "4.2":
                //storage has 100k energy, build bunker roads
                Architect.buildBunkerRoads(room);
                break;
            case "4.3":
                //bunker roads are done, build roads to sources
                Architect.buildUtilityRoads(room);
                Archivist.setRoadsBuilt(room, true);
                break;
            case "5":
                //just turned rcl 5
                //build upgrader link
                Architect.buildBunker(room);
                Architect.buildControllerLink(room);
                global.Imperator.administrators[room].executive.spawnArbiter();
                break;
            case "6":
                //just turned rcl 6
                //build lots of expensive stuff
                Architect.buildBunker(room);
                break;
            case "6.1":
                //build first source link
                Architect.buildSourceLinks(room);
                break;
            case "6.2":
                //build extractor and road to mineral
                Architect.buildExtractor(room);
                break;
            case "6.3":
                //start scouting for remotes
                global.Imperator.administrators[room].executive.spawnExcavator();
                global.Imperator.administrators[room].executive.spawnScout();
                break;
            case "6.4":
                //start reserving and build roads to remote exit
                Architect.prepareForRemote(room);
                break;
            case "6.5":
                //send remote builders
                let remotes = Archivist.getRemotes(room);
                for (let r in remotes) {
                    if (remotes[r].selected) {
                        global.Imperator.administrators[room].executive.spawnProspectors(r);
                        break;
                    }
                }
                break;
            case "7":
                //just turned rcl 7
                //build second source link and get rid of one professor
                Architect.buildBunker(room);
                Architect.buildSourceLinks(room);
                global.Imperator.administrators[room].executive.downscale();
                break;
            case "7.1":
                //everything is done building and storage has > 100,000 energy
                global.Imperator.administrators[room].executive.spawnChemist();
                break;
            case "8":
                //TODO: lots and lots
                Architect.buildBunker(room);
                break;
        }
    }

    /**
     *
     * @param {String} room string representing a room
     * @param {Boolean} dry whether to actually set the anchor or just calculate it
     * @returns
     */
    static calculateAnchor(room: string, dry=false): RoomAnchor | undefined {
        let bunkerSchema = Informant.getBunkerSchema();
        let liveRoom = Game.rooms[room];
        let controller = liveRoom.controller;

        if (liveRoom === undefined || controller === undefined) {
            return undefined;
        }


        if (!dry) {
            //clear out any buildings left by enemies
            let enemyBuildings = Game.rooms[room].find(FIND_STRUCTURES, {
                filter: (struc) => {return struc.structureType != STRUCTURE_STORAGE && struc.structureType != STRUCTURE_TERMINAL}});
            for (let struct of enemyBuildings) {
                if (struct.structureType === STRUCTURE_SPAWN && struct.my) continue;
                struct.destroy();
            }
        }

        //if this is the first room and you have to manually place your spawn, it will calculate the anchor off that placement
        //TODO: figure out a way to avoid user error in spawn placement. possible switch around spawn positions
        let spawns = liveRoom.find(FIND_MY_SPAWNS);
        if (spawns.length > 0) {
            Archivist.build(true)       //reset memory if this is the first spawn
            let spawnPos = {
                "x": spawns[0].pos.x - bunkerSchema["spawn"]["pos"][0].x,
                "y": spawns[0].pos.y - bunkerSchema["spawn"]["pos"][0].y
            }
            if (!dry) {
                Archivist.setAnchor(room, spawnPos)
            }
            console.log(JSON.stringify(spawnPos));
            return spawnPos;
        } else {
            //find positions the bunker could fit
            let candidates = [];
            for (let x = 2; x < 38; x++) {
                for (let y = 2; y < 38; y++) {
                    let dq = false;
                    let wallCounter = 0;
                    for (let candidate of liveRoom.lookAtArea(y, x, y + 10, x + 10, true)) {
                        if (candidate["terrain"] == "wall") {
                            //if it is an edge, give some slack
                            if (candidate.x == x || candidate.x == x+10 || candidate.y == y || candidate.y == y+10) {
                                wallCounter++;
                                if (wallCounter > 5) {
                                    dq = true;
                                    break;
                                }
                            } else {
                                dq = true;
                                break; //break as soon as it is dq
                            }
                        }
                    }
                    if (!dq) {
                        //if the position does not contain a wall, push it to possibles
                        candidates.push({
                            "x": x,
                            "y": y,
                            "walls": wallCounter
                        });
                    }
                }
            }
            //find all the things we want to be close to
            let POVs = [];
            let sources = liveRoom.find(FIND_SOURCES);
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
            let centroidPos = new RoomPosition(centroid["x"], centroid["y"], room);

            let bestCandidate = {
                x: 0,
                y: 0,
                score: 100
            };
            for (let candidate of candidates) {
                let position = new RoomPosition(candidate["x"] + 5, candidate["y"] + 5, room);

                //score is a function of how many walls are in the edges and distance to the centroid
                let candidateScore = position.findPathTo(centroidPos).length + Math.pow(1.75, candidate["walls"]);
                if (bestCandidate["score"] > candidateScore) {
                    bestCandidate["score"] = candidateScore;
                    bestCandidate["x"] = candidate["x"];
                    bestCandidate["y"] = candidate["y"];
                }
            }

            //set the anchor to the best candidate
            if (!dry) {
                Archivist.setAnchor(room, bestCandidate)
            }
            console.log(JSON.stringify(bestCandidate));
            return bestCandidate;
        }
    }

    /**
     * Method that builds all newly unlocked bunker structures
     */
    static buildBunker(room: string): void {
        let bunkerSchema = Informant.getBunkerSchema();
        let liveRoom = Game.rooms[room];

        //get anchor, if there isn't one, calculate a new one
        let anchor = Archivist.getAnchor(room);
        if (!anchor) {
            let newAnchor = Architect.calculateAnchor(room);
            if (newAnchor !== undefined) {
                anchor = newAnchor;
            } else {
                return;
            }
        }

        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);
        let typesToBuild = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_LAB, STRUCTURE_STORAGE, STRUCTURE_LINK, STRUCTURE_FACTORY, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER, STRUCTURE_OBSERVER, STRUCTURE_TERMINAL];

        //hande reliable first spawn building
        if (liveRoom.find(FIND_MY_SPAWNS).length < 1) {
            for (let i =0; i < 10; i++) {
                let success = liveRoom.createConstructionSite(
                    roomAnchor.x + bunkerSchema["spawn"]["pos"][0].x, roomAnchor.y + bunkerSchema["spawn"]["pos"][0].y, STRUCTURE_SPAWN);

                if (success == 0) {
                    break;
                }
            }
        }
        //TODO: build ramparts surrounding our miner boiis
        //builds the appropriate number of each structure type
        for (let type of typesToBuild) {
            Architect.buildNewStructures(type, room);
        }
    }

    /**
     * function to build new structures
     * @param {String} structureConstant structure type constant
     * @param {String} room string representing room
     */
    static buildNewStructures(structureConstant: BuildableStructureConstant, room: string): void {
        let bunkerSchema = Informant.getBunkerSchema();
        let roomAnchor = Archivist.getAnchor(room);
        let liveRoom = Game.rooms[room];
        let controller = liveRoom.controller;
        if (!liveRoom || !controller) return;
        //find how many exist
        let numExist = Game.rooms[room].find(FIND_STRUCTURES, {
            filter: (structure) => {return structure.structureType == structureConstant}}).length;

        //find how many are building
        let numBuilding = Game.rooms[room].find(FIND_MY_CONSTRUCTION_SITES, {
            filter: (structure) => {return structure.structureType == structureConstant}}).length;

        //find how many are possible to build at the current level
        let maxToBuild = CONTROLLER_STRUCTURES[structureConstant][controller.level];
        if (maxToBuild > bunkerSchema[structureConstant]["pos"].length) maxToBuild = bunkerSchema[structureConstant]["pos"].length;

        //calculate the number to build
        let numToBuild = maxToBuild - (numExist + numBuilding);

        if (numExist + numBuilding < maxToBuild) {
            //build the structure
            let index = numExist + numBuilding;
            for (let i = 0; i < numToBuild; i++) {
                let pos = bunkerSchema[structureConstant]["pos"][index + i];
                Game.rooms[room].createConstructionSite(new RoomPosition(roomAnchor.x + pos["x"], roomAnchor.y + pos["y"], room), structureConstant);
            }
        }
    }

    /**
     * Method to build source containers
     * @param {String} room string representing the room
     */
    static buildSourceContainers(room: string): void {
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);

        //build paths from the roomAchor to the sources then build containers at the final step in that path
        let closest = []
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
     * Method that builds roads within the bunker
     * @param {String} room string representing the room
     */
    static buildBunkerRoads(room: string): void {
        //get bunker schematics
        let bunkerSchema = Informant.getBunkerSchema();
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);

        for (let pos of bunkerSchema["road"]["pos"]) {
            Game.rooms[room].createConstructionSite(new RoomPosition(roomAnchor.x + pos["x"], roomAnchor.y + pos["y"], room), STRUCTURE_ROAD);
        }
    }

    /**
     * Method that builds ramparts surrounding the bunker
     * @param {String} room String representing the room
     */
    static buildBunkerRamparts(room: string): void {
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);

        let xMax = roomAnchor.x + 11;
        let yMax = roomAnchor.y + 11;
        for (let x = roomAnchor.x - 1; x <= xMax; x++) {
            for (let y = roomAnchor.y - 1; y <= yMax; y++) {
                if (x == roomAnchor.x - 1 || y == roomAnchor.y - 1 || x == xMax || y == yMax) {
                    Game.rooms[room].createConstructionSite(new RoomPosition(x, y, room), STRUCTURE_RAMPART);
                }
            }
        }
    }

    /**
     * Method that builds roads to all sources
     * @param {String} room string representing the room
     */
    static buildUtilityRoads(room: string): void {
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);
        let roomController = Game.rooms[room].controller;

        if (!roomAnchor || !roomController) return;

        //define corners of the bunker
        let topRight = new RoomPosition(roomAnchor.x + 10, roomAnchor.y, room);
        let topLeft = roomAnchor;
        let bottomLeft = new RoomPosition(roomAnchor.x, roomAnchor.y + 10, room);
        let bottomRight = new RoomPosition(roomAnchor.x + 10, roomAnchor.y + 10, room);

        let topMiddle = new RoomPosition(roomAnchor.x + 5, roomAnchor.y, room);
        let bottomMiddle = new RoomPosition(roomAnchor.x + 5, roomAnchor.y + 10, room);
        let leftMiddle = new RoomPosition(roomAnchor.x, roomAnchor.y + 5, room);
        let rightMiddle = new RoomPosition(roomAnchor.x + 10, roomAnchor.y + 5, room);
        let corners = [topRight, topLeft, bottomLeft, bottomRight, topMiddle, bottomMiddle, leftMiddle, rightMiddle];

        let roadSites = [];

        let travelSources = Game.rooms[room].find(FIND_SOURCES);

        //build roads from the closest corner to the source
        for (let source of travelSources) {
            let selectedCorner = source.pos.findClosestByPath(corners);
            if (selectedCorner) {
                roadSites.push(selectedCorner.findPathTo(source, {range: 1, ignoreCreeps: true}));
            }
        }

        let selectedCorner = roomController.pos.findClosestByPath(corners);
        if (selectedCorner) {
            roadSites.push(selectedCorner.findPathTo(roomController, {range: 1, ignoreCreeps: true}));
        }

        for (let sites of roadSites) {
            for (let site of sites) {
                Game.rooms[room].createConstructionSite(site.x, site.y, STRUCTURE_ROAD);
            }
        }

    }

    /**
     * WIP method to build ramparts in a room
     */
    static buildRamparts(room: string) {
        let liveRoom = Game.rooms[room]
        let anchor = Archivist.getAnchor(room);
        let center = new RoomPosition(anchor.x + 5, anchor.y + 5, room);

        let roomExits = Object.keys(Game.map.describeExits(room)).map(x => parseInt(x));
        let walls: any = [];    //todo: better typing
        //iterate over each of the exits the room has
        for (let direction of roomExits) {
            let allExits = liveRoom.find(direction as any);
            let goals: any = [];    //todo: better typing
            for (let exit of allExits) {
                goals.push({
                        pos: exit,
                        range : 2
                });
            }
            //keep searching towards this exit until the exit is completely blocked off
            while(true) {
                //path find to the exit
                let pathToExit = PathFinder.search(
                    center,
                    goals,
                    {
                        plainCost: 0,
                        swampCost: 0,
                        roomCallback: buildCostMatrix,
                        maxRooms: 1,
                        maxCost: 255
                    }
                );

                //if the path is impossible, we are done with the wall building
                if (pathToExit.incomplete) break;
                pathToExit.path.splice(0, 6);

                //push the first pos of the route, then repath
                walls.push(pathToExit.path[0]);
                new RoomVisual(room).circle(pathToExit.path[0].x, pathToExit.path[0].y, {fill: 'red', radius: 0.5});
            }
        }

        /**
         * Adds the newly planned walls as impassible, so new pathfindings have to path around them
         */
        function buildCostMatrix(room: string) {
            let matrix = new PathFinder.CostMatrix;
            let roomTerrain = Game.rooms[room].getTerrain();
            for (let x = 0; x < 50; x++) {
                for (let y = 0; y < 50; y++) {
                    //set previously built walls as impassible
                    for (let pos of walls) {
                        if (pos.x == x && pos.y == y) {
                            matrix.set(x, y, 0xff);
                        }
                    }
                    if (roomTerrain.get(x, y) === 1) {
                        matrix.set(x, y, 0xff);
                    }
                }
            }
            return matrix;
        }
    }

    /**
     * Method to build the controller link
     * @param {String} room string representing the room
     */
    static buildControllerLink(room: string): void {
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);
        let roomController = Game.rooms[room].controller;
        if (!roomAnchor || !roomController) return;

        //build link
        let pathToController = roomAnchor.findPathTo(roomController.pos, {range: 2, ignoreCreeps: true})
        let closestPosition = new RoomPosition(pathToController[pathToController.length - 1]["x"], pathToController[pathToController.length - 1]["y"], room);
        closestPosition.createConstructionSite(STRUCTURE_LINK);
    }

    /**
     * Method to build the source links
     * @param {String} room string representing the room
     */
    static buildSourceLinks(room: string): void {
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);

        //find the sources and sort by distance
        let sources = Game.rooms[room].find(FIND_SOURCES);
        sources = _.sortBy(sources, source => roomAnchor.getRangeTo(source)).reverse();

        //loop through sources
        for (let source of sources) {
            //find nearby container
            let sourceContainer = source.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => { return structure.structureType == STRUCTURE_CONTAINER
                    && source.pos.inRangeTo(structure, 2)
                }
            });

            //if there is no container, there is already a link so move to next source
            if (!sourceContainer) continue;

            //once a source not in the memory is found, route to it and build a link on the last step of the route
            let pathToContainer = roomAnchor.findPathTo(sourceContainer.pos, {range: 1, ignoreCreeps: true})
            let closestPosition = new RoomPosition(pathToContainer[pathToContainer.length - 1]["x"], pathToContainer[pathToContainer.length - 1]["y"], room);

            if (closestPosition.createConstructionSite(STRUCTURE_LINK) == 0) {
                //remove sourceContainer if a link is successfully built
                sourceContainer.destroy();
                return; //end the function once we have built a link
            }
        }
    }

    /**
     * Method to build road to the room's mineral and an excavator
     * @param {String} room string representing the room
     */
    static buildExtractor(room: string) {
        //get anchor
        let anchor = Archivist.getAnchor(room);
        let roomAnchor = new RoomPosition(anchor["x"], anchor["y"], room);

        //define corners of the bunker
        let topRight = new RoomPosition(roomAnchor.x + 10, roomAnchor.y, room);
        let topLeft = roomAnchor;
        let bottomLeft = new RoomPosition(roomAnchor.x, roomAnchor.y + 10, room);
        let bottomRight = new RoomPosition(roomAnchor.x + 10, roomAnchor.y + 10, room);

        let topMiddle = new RoomPosition(roomAnchor.x + 5, roomAnchor.y, room);
        let bottomMiddle = new RoomPosition(roomAnchor.x + 5, roomAnchor.y + 10, room);
        let leftMiddle = new RoomPosition(roomAnchor.x, roomAnchor.y + 5, room);
        let rightMiddle = new RoomPosition(roomAnchor.x + 10, roomAnchor.y + 5, room);
        let corners = [topRight, topLeft, bottomLeft, bottomRight, topMiddle, bottomMiddle, leftMiddle, rightMiddle];

        let roomMineral = Game.rooms[room].find(FIND_MINERALS)[0];

        //build roads from the closest corner to the mineral
        let selectedCorner = roomMineral.pos.findClosestByPath(corners);
        let roadPath;
        if (selectedCorner) {
            roadPath = selectedCorner.findPathTo(roomMineral, {range: 1, ignoreCreeps: true});
        } else return;

        for (let i in roadPath) {
            if (i as any < roadPath.length - 1) {
                Game.rooms[room].createConstructionSite(roadPath[i].x, roadPath[i].y, STRUCTURE_ROAD);
            } else {
                Game.rooms[room].createConstructionSite(roadPath[i].x, roadPath[i].y, STRUCTURE_CONTAINER);

            }
        }

        //build extractor
        roomMineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
    }

    /**
     * Method to start spawning emissaries and build roads to the remote
     */
    static prepareForRemote(room: string): void {
        //! todo: enable this to allow for more than one remote room
        //! todo: what if the sources in the room are unaccessible behind walls
        //this could be tweaked to just remote at all 'safe' rooms

        //first find the room that we want to remote in.
        let selectedRemote = undefined;
        let remotes = Archivist.getRemotes(room);
        if (remotes === undefined) return;

        let viable = [];
        for (let r of Object.keys(remotes)) {
            if (remotes[r].status == "safe") {
                viable.push(r);
            }
        }

        if (viable.length == 0) {
            selectedRemote = undefined;
        } else if (viable.length == 1) {
            selectedRemote = viable[0];
        } else {
            let best = 10000;
            let bestRoom = "none";
            for (let option of viable) {
                let distances = remotes[option].distances;
                let avg = (distances[0] + distances[1]) / 2;
                if (avg < best) {
                    best = avg;
                    bestRoom = option;
                }
            }

            selectedRemote = bestRoom;
        }

        if (selectedRemote == undefined) return;

        remotes[selectedRemote].selected = true;

        //now we need to spawn the reserver with that room as a target
        global.Imperator.administrators[room].executive.spawnEmissary(selectedRemote, 'reserve');

        //now lets build a road to that exit
        let storage = Game.rooms[room].storage;
        if (storage === undefined) return;
        let roadPath = storage.pos.findPathTo(new RoomPosition(10, 10, selectedRemote), {range: 1, ignoreCreeps: true});


        for (let pos of roadPath) {
            Game.rooms[room].createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
        }
    }
}
