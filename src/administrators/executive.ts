import { Architect } from "./architect";
import { Archivist } from "./archivist";
import { Director } from "./director";

//entity that executes room logic
export class Executive {
    room: string;
    constructor(room: string) {
        this.room = room;
    }

    /**
     * Executive logic to run each tick
     */
    run() {
        //check gamestage every 10 ticks
        if (Game.time % 10 == 0) {
            let calculation = Architect.calculateGameStage(this.room);
            let current = Archivist.getGameStage(this.room);
            //if gamestage is valid and different from what we have stored
            if (calculation != "-1" && current < calculation) {
                //do some architect stuff
                Architect.design(this.room, calculation);
                Archivist.setGameStage(this.room, calculation);
            }
        }

        //once gamestage 5 is active, phasetwo is in effect and dedicated builders should be spawned
        let gameStage = parseFloat(Archivist.getGameStage(this.room));
        if (gameStage >= 4.1) {
            if (Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                let contractors = Archivist.getNumContractors(this.room);

                if (contractors === undefined) {
                    contractors = 0;
                }

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
                    Archivist.setNumContractors(this.room, contractors + 1);
                }
            }
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
    phaseOne() {
        //I think 6 engineers is a good starting point
        for (var i = 0; i < 6; i++) {
            let memory = { "generation": 0 };
            let task = "global.Imperator.administrators[objArr[0]].supervisor.initiate({'body' : [WORK, CARRY, MOVE, MOVE], 'type': 'engineer', 'memory': objArr[1]});";
            Director.schedule(this.room, Game.time + (i * 10), task, [this.room, memory]);
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
            { 'body': [CARRY, CARRY, MOVE, MOVE], 'type': CIVITAS_TYPES.RUNNER, 'memory': memory }
        ]

        for (let source of Object.keys(Archivist.getSources(this.room))) {
            //one miner per source. they spawn their own courier
            creepsToSpawn.push({ 'body': [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], 'type': CIVITAS_TYPES.MINER, 'memory': memory });
        }

        for (let creepToSpawn of creepsToSpawn.reverse()) {
            this.getSupervisor().initiate(creepToSpawn);
        }
    }

    /**
     * Method that starts phase three, the arbiter creep
     */
    spawnArbiter() {
        let arbiter = {
            'body': [
                CARRY, CARRY, CARRY, CARRY
            ],
            'type': 'arbiter',
            'memory': {
                "generation": 0,
                "offRoading": true
            }
        };

        //this is actually kinda insane
        let task =
        `if (global.Imperator.administrators[objArr[0]].supervisor.storageLink) {
            global.Imperator.administrators[objArr[0]].supervisor.initiate(objArr[1])
        } else {
            global.Director.schedule(objArr[0], Game.time + 50, objArr[2], objArr);
        }`
        //todo: fix this, as director is no longer in the global scope

        Director.schedule(this.room, Game.time, task, [this.room, arbiter, task]);
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
    spawnEmissary(targetRoom: string, task='reserve') {
        let body;
        if (task == 'reserve') {
            body = [CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE];
        } else {
            body = [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE];
        }
        this.getSupervisor().initiate({
            'body': body,
            'type': CIVITAS_TYPES.EMISSARY,
            'memory': {'generation' : 0, 'task': task, 'targetRoom': targetRoom, 'offRoading': true}
        });
    }

    /**
     * Method that spawns the two miners that will build the roads and containers in the remote
     * @param {String} targetRoom string representing the room they should move to first
     */
    spawnProspectors(targetRoom: string) {
        for (let i = 0; i < 2; i++) {
            this.getSupervisor().initiate({
                'body': [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
                'type': CIVITAS_TYPES.MINER,
                'memory': {'generation' : 0, 'targetRoom': targetRoom, 'offRoading': true}
            });
        }
    }

    /**
     * Method that spawns the two miners that will build the roads and containers in the remote
     * @param {String} targetRoom string representing the room they should move to first
     */
     spawnCurator(targetRoom: string) {
        this.getSupervisor().initiate({
            'body': [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
            'type': CIVITAS_TYPES.CURATOR,
            'memory': {'generation' : 0, 'targetRoom': targetRoom}
        });
    }


    /**
     * Method to spawn 4 remote engineers to bootstrap a new room
     * @param {String} targetRoom String representing the room
     */
     spawnDevelopers(targetRoom: string) {
        for (let i = 0; i < 4; i++) {
            this.getSupervisor().initiate({
                'body': [
                    WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                    CARRY, CARRY, CARRY, CARRY, CARRY,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                    MOVE, MOVE, MOVE, MOVE, MOVE
                ],
                'type': CIVITAS_TYPES.CONTRACTOR,
                'memory': {'generation':0, 'targetRoom': targetRoom, 'offRoading': true}
            });
        }
    }

    /**
     * Method that spawns the excavator to mine out minerals
     */
    spawnExcavator() {
        //todo: this is unbuildable at rcl 6
        this.getSupervisor().initiate({
            'body': [
                WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
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
    spawnExecutioner(targetRoom: string, boost=true) {
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
            'memory': {'targetRoom': targetRoom, 'offRoading': true}
        }, boost);
    }

    /**
     * Method that spawns a simple harass creep for an enemy's remote mine
     */
     spawnJester(targetRoom: string) {
        this.getSupervisor().initiate({
            'body': [
                ATTACK, MOVE, MOVE
            ],
            'type': LEGION_TYPES.JESTER,
            'memory': {'targetRoom': targetRoom, 'offRoading': true, 'generation': 0}
        });
    }

    /**
     * Method that spawns defenders for remote rooms
     * @param {String} targetRoom string representing the room
     */
     spawnGarrison(targetRoom: string) {
        this.getSupervisor().initiate({
            'body': [
                TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                ATTACK, ATTACK, ATTACK, ATTACK,
                RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                HEAL, HEAL, HEAL
            ],
            'type': LEGION_TYPES.GARRISON,
            'memory': {'targetRoom': targetRoom}
        });
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

module.exports = Executive;
