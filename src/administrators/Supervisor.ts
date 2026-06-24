//administrator imports
import Informant from 'controllers/Informant';
import Director from 'controllers/Director';
import Executive from './Executive';
import Chronicler from 'controllers/Chronicler';

//worker imports
import Civitas from 'civitas/Civitas';
import Miner from 'civitas/workers/Miner';
import Engineer from 'civitas/workers/Engineer';
import Courier from 'civitas/workers/Courier';
import Scholar from 'civitas/workers/Scholar';
import Host from 'civitas/workers/Host';
import Contractor from 'civitas/workers/Contractor';
import Arbiter from 'civitas/workers/Arbiter';
import Excavator from 'civitas/workers/Excavator';
import Scout from 'civitas/workers/Scout';
import Chemist from 'civitas/workers/Chemist';
import Curator from 'civitas/workers/Curator';
import Emissary from 'civitas/workers/Emissary';

//legion imports
import Executioner from 'civitas/Legion/Executioner';
import Garrison from 'civitas/Legion/Garrison';
import Jester from 'civitas/Legion/Jester';


//structure imports
import Castrum from 'castrum/Castrum';
import Conduit from 'castrum/Conduit';
import Workshop from 'castrum/Workshop';
import Nexus from 'castrum/Nexus';
import Bastion from 'castrum/Bastion';
import Market from 'castrum/Market';
import Capacitor from 'castrum/Capacitor';
import Road from 'castrum/Road';
import Container from 'castrum/Container';
import Rampart from 'castrum/Rampart';

// Class registries for dynamic instantiation
const CIVITAS_CLASS_MAP: { [key: string]: new (creep: Creep) => Civitas } = {
    [CIVITAS_TYPES.ARBITER]: Arbiter,
    [CIVITAS_TYPES.CHEMIST]: Chemist,
    [CIVITAS_TYPES.CONTRACTOR]: Contractor,
    [CIVITAS_TYPES.COURIER]: Courier,
    [CIVITAS_TYPES.CURATOR]: Curator,
    [CIVITAS_TYPES.EMISSARY]: Emissary,
    [CIVITAS_TYPES.ENGINEER]: Engineer,
    [CIVITAS_TYPES.EXCAVATOR]: Excavator,
    [CIVITAS_TYPES.HOST]: Host,
    [CIVITAS_TYPES.MINER]: Miner,
    [CIVITAS_TYPES.SCHOLAR]: Scholar,
    [CIVITAS_TYPES.SCOUT]: Scout,
    [LEGION_TYPES.EXECUTIONER]: Executioner,
    [LEGION_TYPES.GARRISON]: Garrison,
    [LEGION_TYPES.JESTER]: Jester,
};

const CASTRUM_CLASS_MAP: { [key: string]: new (...args: any[]) => Castrum } = {
    [CASTRUM_TYPES.BASTION]: Bastion,
    [CASTRUM_TYPES.CONDUIT]: Conduit,
    [CASTRUM_TYPES.MARKET]: Market,
    [CASTRUM_TYPES.NEXUS]: Nexus,
    [CASTRUM_TYPES.WORKSHOP]: Workshop,
    [CASTRUM_TYPES.ROAD]: Road,
    [CASTRUM_TYPES.CONTAINER]: Container,
    [CASTRUM_TYPES.RAMPART]: Rampart
};

export const SPAWN_PRIORITY_MAP: { [key: string]: number } = {
    // Tier 1 - Defense / Host
    [LEGION_TYPES.GARRISON]: 1,
    [CIVITAS_TYPES.HOST]: 1,
    // Tier 2 - Arbiter
    [CIVITAS_TYPES.ARBITER]: 2,
    // Tier 3 - Miners / Haulers
    [CIVITAS_TYPES.MINER]: 3,
    [CIVITAS_TYPES.COURIER]: 3,
    // Tier 4 - Builders / Emissary / Curator
    [CIVITAS_TYPES.ENGINEER]: 4,
    [CIVITAS_TYPES.CONTRACTOR]: 4,
    [CIVITAS_TYPES.EMISSARY]: 4,
    [CIVITAS_TYPES.CURATOR]: 4,
    // Tier 5 - Scout / Excavator / Chemist
    [CIVITAS_TYPES.SCOUT]: 5,
    [CIVITAS_TYPES.EXCAVATOR]: 5,
    [CIVITAS_TYPES.CHEMIST]: 5,
    // Tier 6 - Scholars
    [CIVITAS_TYPES.SCHOLAR]: 6,
    // Tier 7 - Offense (lowest priority)
    [LEGION_TYPES.EXECUTIONER]: 7,
    [LEGION_TYPES.JESTER]: 7,
};

export default class Supervisor {
    room: string;
    civitas: {
        [CIVITAS_TYPES.ARBITER]: Arbiter[],
        [CIVITAS_TYPES.CHEMIST]: Chemist[],
        [CIVITAS_TYPES.CONTRACTOR]: Contractor[],
        [CIVITAS_TYPES.COURIER]: Courier[],
        [CIVITAS_TYPES.CURATOR]: Curator[],
        [CIVITAS_TYPES.EMISSARY]: Emissary[],
        [CIVITAS_TYPES.ENGINEER]: Engineer[],
        [CIVITAS_TYPES.EXCAVATOR]: Excavator[],
        [CIVITAS_TYPES.HOST]: Host[],
        [CIVITAS_TYPES.MINER]: Miner[],
        [CIVITAS_TYPES.SCHOLAR]: Scholar[],
        [CIVITAS_TYPES.SCOUT]: Scout[],
        
        [LEGION_TYPES.EXECUTIONER]: Executioner[],
        [LEGION_TYPES.GARRISON]: Garrison[],
        [LEGION_TYPES.JESTER]: Jester[]

    };
    castrum: {
        [CASTRUM_TYPES.BASTION]: Bastion[],
        [CASTRUM_TYPES.CONDUIT]: Conduit[],
        [CASTRUM_TYPES.MARKET]: Market[],
        [CASTRUM_TYPES.NEXUS]: Nexus[],
        [CASTRUM_TYPES.WORKSHOP]: Workshop[],
        [CASTRUM_TYPES.CAPACITOR]: Capacitor[],
        [CASTRUM_TYPES.ROAD]: Road[],
        [CASTRUM_TYPES.CONTAINER]: Container[],
        [CASTRUM_TYPES.RAMPART]: Rampart[]
    };

    nexusReservation: number;
    workshopReservation: number;

    controllerLink: Conduit | undefined;                    //these get set in the conduit class when they self-classify
    storageLink: Conduit | undefined;                       //
    reagentWorkshops: Array<Workshop>;                      //these get set in the workshop class when they self-classify
    productWorkshops: Array<Workshop>;                      //

    extensionOrder: Id<StructureExtension | StructureSpawn>[];      //What order extensions should be drawn from for optimal filling.
    _extensionOrder: Array<StructureExtension | StructureSpawn>;

    hostSpot: RoomPosition;
    arbiterSpot: RoomPosition;

    lastdismissal: number;

    constructor(room: string) {
        this.room = room;

        this.castrum = this.emptyCastrum;
        this.civitas = this.emptyCivitas;

        this.nexusReservation = 0;
        this.workshopReservation = 0;

        this.reagentWorkshops = [];
        this.productWorkshops = [];

        this.extensionOrder = [];
        this._extensionOrder = [];

        this.lastdismissal = 0;

        this.hostSpot = this.getHostSpot();
        this.arbiterSpot = this.getArbiterSpot();
    }

    /**
     * Method that wraps all gameObj in the room with a wrapper class
     */
    wrap(onlyStructures = false): void {
        let thisRoom = Game.rooms[this.room];
        //initialize all structures in the room with their respective wrappers
        this.castrum = this.emptyCastrum;
        this.reagentWorkshops = [];
        this.productWorkshops = [];
        let ownedStructures = thisRoom.find(FIND_STRUCTURES);
        let roomRemotes = Chronicler.readRemotes(this.room);
        for (let remote in roomRemotes) {
            let remoteData = roomRemotes[remote];
            if (remoteData.status !== REMOTE_STATUSES.CLAIMED && remoteData.status !== REMOTE_STATUSES.INVADED) continue;
            let liveRemote = Game.rooms[remote];
            if (!liveRemote) continue;
            ownedStructures = ownedStructures.concat(liveRemote.find(FIND_STRUCTURES));
        }
        for (var structure of ownedStructures) {
            let castrumType = Informant.mapGameToClass(structure.structureType);
            if (castrumType !== CASTRUM_TYPES.UNDEFINED) {
                if ((structure as OwnedStructure).my === false) continue;
                const Class = CASTRUM_CLASS_MAP[castrumType];
                if (Class) {
                    (this.castrum as any)[castrumType].push(new Class(this, structure));
                }
            }
        }

        //group up extensions into stamps(capacitors)
        this.wrapCapacitors();
        //optimal order of draining extensions
        this.extensionOrder = this.getExtensionOrder();

        if (onlyStructures) return;

        this.civitas = this.emptyCivitas;

        //initialize all creeps in the room to their respective classes
        for (let creepMem of _.filter(Memory.creeps, c => c.spawnRoom == this.room)) {
            if (Game.creeps[creepMem.name]) {
                const Class = CIVITAS_CLASS_MAP[creepMem.type];
                if (Class) {
                    (this.civitas as any)[creepMem.type].push(new Class(Game.creeps[creepMem.name]));
                }
            } else {
                //the creep is dead. This should only happen if a creep dies on the same tick as a global reset.
                //if it is a rebirth creep, rebirth it, otherwise delete the memory
                if (creepMem.generation !== undefined) {
                    let template = {
                        "body": creepMem.body,
                        "type": creepMem.type,
                        "memory": creepMem
                    };
                    this.queueCreep(template);
                }
                delete Memory.creeps[creepMem.name];
            }
        }
    }

    /**
     * Function that runs all objects in the room
     */
    run() {
        this._extensionOrder = [];
        var errInfo = '';
        //first all creeps
        let civitas = this.civitas;
        let type: keyof typeof civitas
        for (type in this.civitas) {
            for (var civ of [...this.civitas[type]]) {
                try {
                    if (civ.liveObj === undefined || civ.liveObj.spawning) continue;
                    let startcpu = Game.cpu.getUsed()
                    let success = civ.preTick();
                    if (success === true) civ.run();
                    let usedCpu = Game.cpu.getUsed() - startcpu;

                    if (usedCpu > 0.3 && global.logger == true) {
                        console.log(civ.name);
                        console.log(usedCpu);
                    }
                } catch (roomErr: any) {
                    let errorMessage = `<b style='color:red;'>Room FAILURE during execution of ${civ.name} working in room ${civ.assignedRoom} with message '${roomErr.message}'' at ${roomErr.stack}</b>`
                    console.log(errorMessage);
                    if (Game.time % 30 == 0) {
                        Game.notify(errorMessage);
                    }
                }
            }
        }

        //then all structures
        let castrum = this.castrum;
        let cType: keyof typeof castrum;
        for (cType in castrum) {
            for (let struc of [...this.castrum[cType]]) {
                try {
                    struc.run();
                } catch (roomErr: any) {
                    let errorMessage = `<b style='color:red;'>Room FAILURE during execution of ${struc.type} in room ${this.room} with message '${roomErr.message}'' at ${roomErr.stack}</b>`
                    console.log(errorMessage);
                    if (Game.time % 30 == 0) {
                        Game.notify(errorMessage);
                    }
                }
            }
        }
    }

    /**
     * Method that refreshes the live references every tick
     */
    refresh() {
        let civitas = this.civitas;
        let type: keyof typeof civitas
        for (type in this.civitas) {
            for (let civ of [...this.civitas[type]]) {
                civ.update();
            }
        }

        //refresh the live game object reference for every structure
        let castrum = this.castrum;
        let cType: keyof typeof castrum;
        for (cType in this.castrum) {
            for (let struc of [...castrum[cType]]) {
                if (!struc.update() && !(struc instanceof Capacitor)) {
                    //structure has died, lets replace it.
                    //if we need to destroy a structure call decomission first then delete it
                    Game.rooms[this.room].createConstructionSite(
                        struc.pos.x, 
                        struc.pos.y, 
                        struc.structureType
                    );
                }
            }
        }
    }

    /**
     * Function that takes a creep object and makes a new creep based on that object
     * @param {Object} template An object that contains body, type, and memory
     * @param {boolean} rebirth whether or not this is a rebirth
     */
    initiate(template: RenewalTemplate): boolean {
        if (this.nexusReservation <= Game.time) {
            //use the body stored in memory if it exists, as it can contain evolutions
            let newBody = template.memory.body;
            if (!newBody) {
                newBody = template.body;
            }

            if (template.memory.generation !== undefined) {
                template.memory.generation++;
            }

            if (template.boost === true) {
                //handle if the creep will be boosted when it spawns
                var boostType = this.calculateBoosts(template.type);
                if (boostType !== undefined) {
                    template.memory.boost = boostType;
                }
            }

            //loop through the spawns until an available one is found
            for (let nexus of this.castrum[CASTRUM_TYPES.NEXUS]) {
                if (!(nexus instanceof Nexus)) continue;
                if (!nexus.spawning && !nexus.spawningThisTick) {

                    let success = nexus.spawnCreep(newBody, template.type, { ...template.memory });

                    if (success == OK) {
                        //don't try spawning on another spawn
                        if (template.boost === true && boostType !== undefined) this.prepareBoosts(boostType, newBody);
                        return true;
                    }
                }
            }
            //decrement generation if spawning failed
            if (template.memory.generation !== undefined) {
                template.memory.generation--;
            }
        }
        return false;
    }

    queueCreep(template: RenewalTemplate): void {
        let priority = SPAWN_PRIORITY_MAP[template.type] || 10;
        let queuedCreep: QueuedCreep = {
            room: this.room,
            template: {...template}
        }
        Director.scheduleCreep(this.room, priority, queuedCreep);
    }

    //todo: write wrapStructure so we don't have to wrap all structures whenever one is built

    /**
     * Function to wrap a newly created creep
     * @param {String} creepName Name of the creep
     * @returns {Boolean} if the new wrapper was created
     */
    wrapCreep(creepName: string): boolean {
        let creep = Game.creeps[creepName];
        //check if the creep has already been wrapped
        if (creep && !Informant.getWrapper(creep.id)) {
            let type = creep.memory.type;
            const Class = CIVITAS_CLASS_MAP[type];
            if (!Class || !(this.civitas as any)[type]) {
                return false;
            }
            (this.civitas as any)[type].push(new Class(creep));
            return true;
        }
        return false;
    }

    /**
     * Delete the wrapper holding the dead creep
     * @param {Civitas} civitas
     */
    dismiss(civitasType: Civitas): void {
        this.lastdismissal = Game.time;
        let origArr = this.civitas[civitasType.type];
        let index = origArr.indexOf(civitasType as any);
        if (index >= 0) origArr.splice(index, 1);
        delete Memory.creeps[civitasType.memory.name];
    }

    /**
     * Delete the wrapper for a destroyed building
     * @param {Castrum} castrumType
     */
    decommission(castrumType: Castrum): void {
        let type = castrumType.type;
        if (type === CASTRUM_TYPES.UNDEFINED) {
            throw Error('undefined castrum type cannot be decommissioned')
        }
        let origArr = this.castrum[type];
        let index = origArr.indexOf(castrumType as any);
        if (index >= 0) origArr.splice(index, 1);
    }

    requestRepair(target: Road | Container | Rampart): void {
        for (let bastion of this.castrum[CASTRUM_TYPES.BASTION]) {
            if (!bastion.repairTarget) {
                bastion.repairTarget = target;
                break;
            }
        }
    }

    /**
     * Method that gets the chemist to prepare for boosting a creep and returns the type of boost
     * @param {String} creepType role of the creep
     * @returns the boost type for the role
     */
    calculateBoosts(creepType: CIVITAS_TYPES | LEGION_TYPES): MineralBoostConstant[] | undefined{
        let rcl = Game.rooms[this.room].controller?.level || 0;
        let boostTypes;
        switch (creepType) {
            case CIVITAS_TYPES.SCHOLAR:
                if (rcl === 7) {
                    boostTypes = [RESOURCE_GHODIUM_HYDRIDE];
                } else if (rcl === 8) {
                    boostTypes = [RESOURCE_CATALYZED_GHODIUM_ACID];
                }
                break;
            case LEGION_TYPES.EXECUTIONER:
                boostTypes = [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE];
                break;
        }
        if (boostTypes === undefined) {
            return undefined;
        }

        return [...boostTypes];
    }

    prepareBoosts(boosts: MineralBoostConstant[], body: BodyPartConstant[]) {
        let boostingWorkshops = Chronicler.readBoostingWorkshops(this.room);
        for (let boost of boosts) {
            let partType;
            for (let part in BOOSTS) {
                if (Object.keys(BOOSTS[part]).includes(boost)) {
                    partType = part;
                    break;
                }
            }
            let numParts = 0;
            for (let part of body) {
                if (part == partType) {
                    numParts++;
                }
            }
            for (let workshop of this.productWorkshops) {
                if (workshop.boosting === false) {
                    boostingWorkshops[boost] = {
                        workshop: workshop.id as Id<StructureLab>,
                        amount: numParts * 30
                    }
                    workshop.boosting = true;
                }
                break;
            }
        }
        Chronicler.writeBoostingWorkshops(this.room, boostingWorkshops);
    }

    /**
     * Function to wrap capacitors. Schema is already sorted by nearest to center, so capacitors are as well
     */
    wrapCapacitors() {
        let schema = Chronicler.readSchema(this.room);
        for (let ext of schema.extensions) {
            this.castrum[CASTRUM_TYPES.CAPACITOR].push(new Capacitor(ext, this.room))
        }
    }

    getExtensionOrder(): Id<StructureExtension | StructureSpawn>[] {
        let spawns = this.castrum[CASTRUM_TYPES.NEXUS];
        let capacitors = this.castrum[CASTRUM_TYPES.CAPACITOR];
        let sortedExtensions: Id<StructureExtension | StructureSpawn>[] = [];
        for (let spawn of spawns) {
            sortedExtensions.push(spawn.id);
        }
        for (let capacitor of capacitors) {
            for (let extensionId of capacitor.extensions) {
                sortedExtensions.push(extensionId);
            }
        }
        return sortedExtensions;
    }

    /**
     * Method to block spawning for n ticks
     */
    reserveNexus(numTicks = 5) {
        this.nexusReservation = Game.time + numTicks;
    }

    /**
     * Method to block workshops for n ticks
     */
    reserveWorkshops(numTicks = 1000) {
        this.workshopReservation = Game.time + numTicks;
    }

    get emptyCivitas() {
        return {
            [CIVITAS_TYPES.ARBITER]: [],
            [CIVITAS_TYPES.CHEMIST]: [],
            [CIVITAS_TYPES.CONTRACTOR]: [],
            [CIVITAS_TYPES.COURIER]: [],
            [CIVITAS_TYPES.CURATOR]: [],
            [CIVITAS_TYPES.EMISSARY]: [],
            [CIVITAS_TYPES.ENGINEER]: [],
            [CIVITAS_TYPES.EXCAVATOR]: [],
            [CIVITAS_TYPES.HOST]: [],
            [CIVITAS_TYPES.MINER]: [],
            [CIVITAS_TYPES.SCHOLAR]: [],
            [CIVITAS_TYPES.SCOUT]: [],

            [LEGION_TYPES.EXECUTIONER]: [],
            [LEGION_TYPES.GARRISON]: [],
            [LEGION_TYPES.JESTER]: []
        }   
    }

    get emptyCastrum() {
        return {
            [CASTRUM_TYPES.BASTION]: [],
            [CASTRUM_TYPES.CONDUIT]: [],
            [CASTRUM_TYPES.MARKET]: [],
            [CASTRUM_TYPES.NEXUS]: [],
            [CASTRUM_TYPES.WORKSHOP]: [],
            [CASTRUM_TYPES.CAPACITOR]: [],
            [CASTRUM_TYPES.ROAD]: [],
            [CASTRUM_TYPES.CONTAINER]: [],
            [CASTRUM_TYPES.RAMPART]: []
        }
    }

    /**
     * Spawns a panic Host creep to fill extensions and towers in emergency situations
     * Call from terminal: global.Imperator.administrators["W8N3"].supervisor.panic()
     */
    panic(): void {
        this.queueCreep({
            body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
            type: CIVITAS_TYPES.HOST,
            memory: {}
        });
    }

    /**
     * Getter to return the paired executive
     * @returns Executive
     */
    get executive(): Executive {
        return global.Imperator.administrators[this.room].executive;
    }

    get energyStructures(): Array<StructureExtension | StructureSpawn> {
        if (this._extensionOrder.length === 0) {
            let extensions: Array<StructureExtension | StructureSpawn> = [];
            this.extensionOrder.forEach(function(s) {
                let liveObj = Game.getObjectById(s) || undefined;
                if (liveObj !== undefined) extensions.push(liveObj);
            })
            this._extensionOrder = extensions;
        }
        return this._extensionOrder;
    }

    getArbiterSpot(): RoomPosition {
        let schema = Chronicler.readSchema(this.room).main;

        return new RoomPosition(
            schema.anchor.x + 1,
            schema.anchor.y + 1,
            this.room
        );
    }

    getHostSpot(): RoomPosition {
        let schema = Chronicler.readSchema(this.room).main;
        let rotations = schema.rotations;
        let offsets = [[1, 0], [2, 1], [1, 2], [0, 1]];
        let offset = offsets[rotations % 4];

        return new RoomPosition(
            schema.anchor.x + offset[0],
            schema.anchor.y + offset[1],
            this.room
        );
    }
}
