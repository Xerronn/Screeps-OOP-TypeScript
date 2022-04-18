import Director from "controllers/Director";
import Architect from "../controllers/Architect";
import Chronicler from "../controllers/Chronicler";
import Informant from "../controllers/Informant";

//entity that executes room logic
export default class Executive {
    room: string;

    architect: Architect;
    
    constructor(room: string) {
        this.room = room;
        if (!Chronicler.readRoomRegistered(this.room)) {
            let schematic = Architect.plan(this.room);
            let resources = Informant.prospect(this.room);
            Chronicler.registerRoom(this.room, schematic, resources);
        }
    }

    /**
     * Executive logic to run each tick
     */
    run() {
        if (Game.time % 30 === 0) {
            let calculation = Informant.calculateGameStage(this.room);
            let current = Chronicler.readGameStage(this.room);
            if (calculation !== -1 && current < calculation) {
                Chronicler.writeGameStage(this.room, calculation);
                this.execute(calculation);
            }
            let buildRoads = current > 4.1;
            Architect.buildRoom(this.room, buildRoads)
        }

        //once gamestage 5 is active, phasetwo is in effect and dedicated builders should be spawned
        let gameStage = Chronicler.readGameStage(this.room);
        if (gameStage >= 4.1) {
            if (Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                let contractors = Chronicler.readNumContractors(this.room);

                let numToSpawn = 2;
                let spawnBody = [
                    WORK, WORK, WORK, WORK,
                    CARRY, CARRY, CARRY, CARRY,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
                ]

                //once we reach rcl 7, we downscale to a single double powerful contractor
                if (gameStage >= 7) {
                    numToSpawn = 1;
                    spawnBody = [
                        WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                        CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
                    ]
                }

                if (contractors < numToSpawn) {
                    this.getSupervisor().initiate({
                        'body': spawnBody,
                        'type': CIVITAS_TYPES.CONTRACTOR,
                        'memory': { "generation": 0 }
                    });
                    Chronicler.writeNumContractors(this.room, contractors + 1);
                }
            }
        }

        //Once gamestage is higher than 6.4, we start doing some remote logic
        if (gameStage >= 6.4) {
            let remotes = Chronicler.readRemotes(this.room);
            for (let remote in remotes) {
                let remoteData = remotes[remote];
                
                if (remoteData.status === REMOTE_STATUSES.CLAIMED || remoteData.status === REMOTE_STATUSES.INVADED) {
                    //we own this remote room, so do some logic
                    let liveRemote = Game.rooms[remote];

                    //check that we have vision
                    if (liveRemote === undefined) continue;

                    //make creeps flee when invaders are present
                    if (!Chronicler.readRemoteGarrisoned(this.room, remote)) {
                        let numEnemies = liveRemote.find(FIND_HOSTILE_CREEPS).length;
                        if (numEnemies > 0) {
                            Chronicler.writeRemoteStatus(this.room, remote, REMOTE_STATUSES.INVADED);
                            this.spawnGarrison(remote);
                            Chronicler.writeRemoteGarrisoned(this.room, remote, true);
                        } else {
                            Chronicler.writeRemoteStatus(this.room, remote, REMOTE_STATUSES.CLAIMED);
                        }
                    }

                    //every 100 ticks check to see if a road is below 2000 hits
                    let curatorSpawned = Chronicler.readRemoteCurated(this.room, remote);
                    if (Game.time % 100 == 0 && !curatorSpawned) {
                        let allRoads = liveRemote.find(FIND_STRUCTURES, {filter:{structureType: STRUCTURE_ROAD}});

                        for (let road of allRoads) {
                            if (road.hits < road.hitsMax / 2.5) {
                                this.spawnCurator(remote);
                                Chronicler.writeRemoteCurated(this.room, remote, true);
                                break;
                            }
                        }
                    }

                    //plan roads and then spawn engineers and eventually miners
                    if (remoteData.roadsBuilt === undefined || remoteData.roadsBuilt === false) {
                        //get last road tile leading into the remote room
                        let exit = Game.rooms[this.room].findExitTo(remote);
                        if (exit === -2 || exit === -10) throw Error("Room does not have exit to remote");
                        Architect.buildRemotePaths(this.room, remote, exit);
                        Chronicler.writeRemoteRoadsBuilt(this.room, remote, true);
                        let sources = liveRemote.find(FIND_SOURCES);
                        for (let source of sources) {
                            this.getSupervisor().initiate({
                                'body' : [
                                    WORK, WORK, WORK, WORK, 
                                    CARRY, CARRY, CARRY, CARRY,
                                    MOVE, MOVE, MOVE, MOVE, 
                                    MOVE, MOVE, MOVE, MOVE
                                ], 
                                'type': CIVITAS_TYPES.ENGINEER, 
                                'memory': {'generation': 0, 'assignedRoom': remote, 'sourceId': source.id, 'offRoading': true}
                            });

                            let memory = { 'generation': 0, 'assignedRoom': remote, 'sourceId': source.id, 'courierSpawned': false};
                            let task = `global.Imperator.administrators[${this.room}].supervisor.initiate(
                                {
                                    'body' : [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], 
                                    'type': '${CIVITAS_TYPES.MINER}', 
                                    'memory': objArr[0]
                                });
                            `;
                            Director.schedule(this.room, Game.time + 2000, task, [memory]);            
                        }
                    }
                }
            }
        }
    }

    /**
     * Function to do room planning whenever gamestage changes
     * @param {String} room string representation of a room
     */
    execute(gameStage: number) {
        switch (gameStage) {
            case 1:
                //calculate anchor and build spawn
                // // Architect.buildBunker(room);
                if (Game.rooms[this.room].find(FIND_MY_SPAWNS).length > 0) {
                    //start the room off with the five basic engineers
                    this.phaseOne();
                }
                break;
            case 2:
                //turning rcl 2
                break;
            case 3:
                //turning rcl 3
                //build the first few extensions
                break;
            case 3.1:
                //towers are built
                //activate phaseOne at gamestage 3.1 if this isn't the first room
                if (global.Imperator.dominion.length > 1) {
                    this.phaseOne();
                }
                break;
            case 4:
                Architect.buildSourceContainers(this.room);
                //just turned rcl 4
                break;
            case 4.1:
                //storage is built, time to switch to phase two
                this.phaseTwo();
                break;
            case 4.2:
                //storage has 100k energy, enable stamp roads building
                break;
            case 4.3:
                //bunker roads are done, build roads to sources
                Architect.buildPaths(this.room);
                Chronicler.writeRoadsBuilt(this.room, true);
                break;
            case 5:
                //just turned rcl 5
                //build upgrader link
                Architect.buildControllerLink(this.room);
                break;
            case 5.1:
                //links are built
                this.spawnArbiter();
                break;
            case 6:
                //just turned rcl 6
                //build lots of expensive stuff
                break;
            case 6.1:
                //build first source link
                Architect.buildSourceLink(this.room);
                break;
            case 6.2:
                //build extractor and road to mineral
                Architect.buildExtractor(this.room);
                break;
            case 6.3:
                //start scouting for remotes
                this.spawnExcavator();
                this.spawnScout();
                break;
            case 6.4:
                //start reserving and build roads to remote exit
                this.remote();
                break;
            case 6.5:
                //send remote builders
                // let remotes = Chronicler.readRemotes(this.room);
                // for (let r in remotes) {
                //     if (remotes[r].selected) {
                //         this.spawnProspectors(r);
                //         break;
                //     }
                // }
                break;
            case 7:
                //just turned rcl 7
                //build second source link and get rid of one professor
                // Architect.buildSourceLinks(room);
                this.downscale();
                break;
            case 7.1:
                //everything is done building and storage has > 100,000 energy
                this.spawnChemist();
                break;
            case 8:
                //TODO: lots and lots
                break;
        }
    }

    /**
     * Function to get the room's supervisor
     * @returns Supervisor
     */
    getSupervisor() {
        return global.Imperator.administrators[this.room].supervisor;
    }

    /**
     * Initialize spawning for phase one rooms
     * Phase one is defined as RCL 1-4
     */
    phaseOne(numToSpawn=12) {
        let resources = Chronicler.readResources(this.room);
        for (let resource in resources) {
            //one miner per source. they spawn their own courier
            let liveResource = resources[resource as keyof RoomResources];
            if (liveResource.type === 'source') {
                //Spawn either the number of open spots times 2 or half of numToSpawn, whichever is lower
                for (var i = 0; i < Math.min(numToSpawn / 2, liveResource.openSpots * 2); i++) {
                    let memory = {"generation": 0, "sourceId": resource, "courierSpawned": false};
                    this.getSupervisor().initiate({'body' : [WORK, CARRY, MOVE, MOVE], 'type': CIVITAS_TYPES.ENGINEER, 'memory': memory})
                }
            }
        }

        
    }

    /**
     * Phase out the engineers in favor of specialized creeps
     */
    phaseTwo() {
        for (let creep of Game.rooms[this.room].find(FIND_MY_CREEPS)) {
            //remove rebirth for engineers
            delete creep.memory.generation;
        }

        //spawn creeps with rebirth enabled
        let memory = { "generation": 0 };
        let creepsToSpawn = [
            { 'body': [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], 'type': CIVITAS_TYPES.SCHOLAR, 'memory': memory },
            { 'body': [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], 'type': CIVITAS_TYPES.SCHOLAR, 'memory': memory },
            { 'body': [CARRY, CARRY, MOVE, MOVE], 'type': CIVITAS_TYPES.HOST, 'memory': memory }
        ]

        let resources = Chronicler.readResources(this.room);
        for (let resource in resources) {
            //one miner per source. they spawn their own courier
            let liveResource = resources[resource as keyof RoomResources];
            if (liveResource.type === 'source') {
                let minerMemory = { "generation": 0, "sourceId": resource, "courierSpawned": false};
                creepsToSpawn.push({ 'body': [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], 'type': CIVITAS_TYPES.MINER, 'memory': minerMemory });
            }
        }

        for (let creepToSpawn of creepsToSpawn.reverse()) {
            this.getSupervisor().initiate(creepToSpawn);
        }
    }

    /**
     * Method that starts phase three, the arbiter creep
     */
    spawnArbiter() {
        this.getSupervisor().initiate({
            'body': [
                CARRY, CARRY, CARRY, CARRY, MOVE, MOVE
            ],
            'type': CIVITAS_TYPES.ARBITER,
            'memory': {
                "generation": 0,
                "offRoading": true
            }
        });
    }

    /**
     * Method that spawns a single scout creep
     */
    spawnScout() {
        this.getSupervisor().initiate({
            'body': [MOVE],
            'type': CIVITAS_TYPES.SCOUT,
            'memory': {'generation' : 0, 'offRoading': true}
        });
    }

    /**
     * Method that spawns an emissary to either claim a new room or reserve a remote room
     * @param {String} task either 'reserve' or 'claim'
     */
    spawnEmissary(assignedRoom: string, task='reserve') {
        let body;
        if (task == 'reserve') {
            body = [CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE];
        } else {
            body = [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE];
        }
        this.getSupervisor().initiate({
            'body': body,
            'type': CIVITAS_TYPES.EMISSARY,
            'memory': {'generation' : 0, 'task': task, 'assignedRoom': assignedRoom, 'offRoading': true}
        });
    }

    /**
     * Method that spawns the two miners that will build the roads and containers in the remote
     * @param {String} assignedRoom string representing the room they should move to first
     */
    spawnCurator(assignedRoom: string) {
        this.getSupervisor().initiate({
            'body': [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
            'type': CIVITAS_TYPES.CURATOR,
            'memory': {'generation' : 0, 'assignedRoom': assignedRoom}
        });
    }


    /**
     * Method to spawn 4 remote engineers to bootstrap a new room
     * @param {String} assignedRoom String representing the room
     */
    spawnDevelopers(assignedRoom: string) {
        for (let i = 0; i < 4; i++) {
            this.getSupervisor().initiate({
                'body': [
                    WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                    CARRY, CARRY, CARRY, CARRY, CARRY,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE
                ],
                'type': CIVITAS_TYPES.CONTRACTOR,
                'memory': {'generation':0, 'assignedRoom': assignedRoom, 'offRoading': true}
            });
        }
    }

    /**
     * Method that spawns the excavator to mine out minerals
     */
    spawnExcavator() {
        this.getSupervisor().initiate({
            'body': [
                WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ],
            'type': CIVITAS_TYPES.EXCAVATOR,
            'memory': {'generation':0}
        });
    }

    /**
     * Method that spawns the chemist to start making boosts
     */
    spawnChemist() {
        this.getSupervisor().initiate({
            'body': [
                CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ],
            'type': CIVITAS_TYPES.CHEMIST,
            'memory': {'generation':0}
        });
    }

    //Military Creep spawning

    /**
     * Method that spawns an executioner to destroy a low level room <7 rcl
     */
    spawnExecutioner(assignedRoom: string, boost=true) {
        this.getSupervisor().initiate({
            'body': [
                TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ],
            'type': LEGION_TYPES.EXECUTIONER,
            'memory': {'assignedRoom': assignedRoom, 'offRoading': true}
        }, boost);
    }

    /**
     * Method that spawns a simple harass creep for an enemy's remote mine
     */
    spawnJester(assignedRoom: string) {
        this.getSupervisor().initiate({
            'body': [
                ATTACK, MOVE, MOVE
            ],
            'type': LEGION_TYPES.JESTER,
            'memory': {'assignedRoom': assignedRoom, 'offRoading': true, 'generation': 0}
        });
    }

    /**
     * Method that spawns defenders for remote rooms
     * @param {String} assignedRoom string representing the room
     */
    spawnGarrison(assignedRoom: string) {
        this.getSupervisor().initiate({
            'body': [
                TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                ATTACK, ATTACK, ATTACK, ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                HEAL, HEAL, HEAL
            ],
            'type': LEGION_TYPES.GARRISON,
            'memory': {'assignedRoom': assignedRoom}
        });
    }

    /**
     * Select remotes, then build roads
     */
    remote() {
        let remotes = Chronicler.readRemotes(this.room);
        for (let remote in remotes) {
            let remoteData = remotes[remote];
            if (remoteData.status == REMOTE_STATUSES.SAFE && remoteData.distances.length === 2) {
                let exit = Game.rooms[this.room].findExitTo(remote);
                if (exit === -2 || exit === -10) throw Error("Room does not have exit to remote");
                Architect.buildExitPaths(this.room, exit);
                this.spawnEmissary(remote, 'reserve');
                Chronicler.writeRemoteStatus(this.room, remote, REMOTE_STATUSES.CLAIMED);
                break;
            }
        }
    }

    /**
     * Method that removes one of the scholars and two haulers upon reaching rcl 7 and max creeps are available
     */
    downscale() {
        //todo: redo this knowing that remote type creeps are not a thing
        // let supervisor = this.getSupervisor();
        // // delete supervisor.civitates.scholar[0].memory.generation;
        // let haulers = supervisor.civitas.hauler;

        // let sources = [];
        // for (let hauler of haulers) {
        //     if (!sources.includes(hauler.memory.source)) {
        //         sources.push(hauler.memory.source);
        //         delete hauler.memory.generation;
        //     } else {
        //         //make the hauler bigger to make up for the loss of his buddy
        //         //lose out on some energy, but the cpu savings are worth it
        //         hauler.evolve();
        //     }
        // }
    }
}
