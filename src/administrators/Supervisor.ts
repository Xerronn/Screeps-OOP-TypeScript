//administrator imports
import Informant from 'controllers/Informant';          Informant;
import Director from 'controllers/Director';            Director;
import Executive from './Executive';                    Executive;

//worker imports
import Civitas from 'civitas/Civitas';                  Civitas;
import Miner from 'civitas/workers/Miner';              Miner;
import Engineer from 'civitas/workers/Engineer';        Engineer;
import Courier from 'civitas/workers/Courier';          Courier;
import Scholar from 'civitas/workers/Scholar';          Scholar;
import Host from 'civitas/workers/Host';                Host;
import Contractor from 'civitas/workers/Contractor';    Contractor;
import Arbiter from 'civitas/workers/Arbiter';          Arbiter;
import Excavator from 'civitas/workers/excavator';      Excavator;
import Scout from 'civitas/workers/scout';              Scout;
import Chemist from 'civitas/workers/Chemist';          Chemist;
import Curator from 'civitas/workers/Curator';          Curator;
import Emissary from 'civitas/workers/Emissary';        Emissary;

//legion imports
import Executioner from 'civitas/Legion/Executioner';   Executioner;
import Garrison from 'civitas/Legion/Garrison';         Garrison;
import Jester from 'civitas/Legion/Jester';             Jester;


//structure imports
import Castrum from 'castrum/Castrum';                  Castrum;
import Conduit from 'castrum/Conduit';                  Conduit;
import Workshop from 'castrum/Workshop';                Workshop;
import Nexus from 'castrum/Nexus';                      Nexus;
import Bastion from 'castrum/Bastion';                  Bastion;
import Market from 'castrum/Market';                    Market;

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
    };
    primitives: {                                           //castrum that I don't need full logic wrappers for
        [CASTRUM_TYPES.CONTAINER]: Id<StructureContainer>[],
        [CASTRUM_TYPES.EXTENSION]: Id<StructureExtension>[],
        [CASTRUM_TYPES.ROAD]: Id<StructureRoad>[]
    };
    _primitives: {                                          //the current tick live game objects
        [CASTRUM_TYPES.CONTAINER]: StructureContainer[],
        [CASTRUM_TYPES.EXTENSION]: StructureExtension[],
        [CASTRUM_TYPES.ROAD]: StructureRoad[]
    }

    nexusReservation: number;
    workshopReservation: number;

    controllerLink: Conduit | undefined;                    //these get set in the conduit class when they self-classify
    storageLink: Conduit | undefined;                       //
    reagentWorkshops: Array<Workshop>;
    productWorkshops: Array<Workshop>;

    constructor(room: string) {
        this.room = room;

        this.castrum = this.emptyCastrum;
        this.civitas = this.emptyCivitas;
        this.primitives = this.emptyPrimitives;
        this._primitives = this.emptyPrimitives;

        this.nexusReservation = 0;
        this.workshopReservation = 0;

        this.reagentWorkshops = [];
        this.productWorkshops = [];
    }

    /**
     * Method that wraps all gameObj in the room with a wrapper class
     */
    wrap(onlyStructures = false): void {
        let thisRoom = Game.rooms[this.room];
        //initialize all structures in the room with their respective wrappers
        this.castrum = this.emptyCastrum;
        this.primitives = this.emptyPrimitives;
        this._primitives = this.emptyPrimitives;
        this.reagentWorkshops = [];
        this.productWorkshops = [];
        for (var structure of thisRoom.find(FIND_STRUCTURES)) {
            let castrumType = Informant.mapGameToClass(structure.structureType);
            if (castrumType !== CASTRUM_TYPES.UNDEFINED && castrumType !== CASTRUM_TYPES.CONTAINER && castrumType !== CASTRUM_TYPES.EXTENSION && castrumType !== CASTRUM_TYPES.ROAD) {
                if ((structure as OwnedStructure).my === false) continue;
                let createObjStr = "this.castrum[\"" + castrumType + "\"].push(new " + castrumType.charAt(0).toUpperCase() +
                    castrumType.slice(1) + "(structure));";
                eval(createObjStr);
            } else if (castrumType !== CASTRUM_TYPES.UNDEFINED) {
                //cache for basic structures like roads and containers
                this.primitives[castrumType].push(structure.id as any);
            }
        }

        if (onlyStructures) return;

        this.civitas = this.emptyCivitas;

        //initialize all creeps in the room to their respective classes
        for (let creepMem of _.filter(Memory.creeps, c => c.spawnRoom == this.room)) {
            if (Game.creeps[creepMem.name]) {
                let createObjStr = "this.civitas[\"" + creepMem.type + "\"].push(new " + creepMem.type.charAt(0).toUpperCase() +
                    creepMem.type.slice(1) + "(Game.creeps[\"" + creepMem.name + "\"]));";

                eval(createObjStr);
            } else {
                //the creep is dead. This should only happen if a creep dies on the same tick as a global reset.
                //if it is a rebirth creep, rebirth it, otherwise delete the memory
                if (creepMem.generation !== undefined) {
                    let template = {
                        "body": creepMem.body,
                        "type": creepMem.type,
                        "memory": creepMem
                    };
                    this.initiate(template);
                }
                delete Memory.creeps[creepMem.name];
            }
        }
    }

    /**
     * Function that runs all objects in the room
     */
    run() {
        //first delete last tick's cache of primitives
        this._primitives = this.emptyPrimitives;
        var errInfo = '';
        try {
            //first all creeps
            let civitas = this.civitas;
            let type: keyof typeof civitas
            for (type in this.civitas) {
                for (var civ of this.civitas[type]) {
                    if (civ.liveObj.spawning) continue;
                    let startcpu = Game.cpu.getUsed()
                    errInfo = `${civ.name} working in room ${civ.assignedRoom}`;
                    let success = civ.preTick();
                    if (success === true) civ.run();
                    let usedCpu = Game.cpu.getUsed() - startcpu;

                    if (usedCpu > 0.3 && global.logger == true) {
                        console.log(civ.name);
                        console.log(usedCpu);
                    }
                }
            }

            //then all structures
            let castrum = this.castrum;
            let cType: keyof typeof castrum;
            for (cType in castrum) {
                for (let struc of this.castrum[cType]) {
                    //block workshops from running when they are reserved
                    if (cType !== CASTRUM_TYPES.WORKSHOP || this.workshopReservation < Game.time) {
                        errInfo = `${struc.type} in room ${this.room}`
                        struc.run();
                    }
                }
            }
        } catch (roomErr: any) {
            let errorMessage = `<b style='color:red;'>Room FAILURE during execution of '${errInfo}' with message '${roomErr.message}'' at ${roomErr.stack}</b>`
            console.log(errorMessage);
            if (Game.time % 30 == 0) {
                Game.notify(errorMessage);
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
            for (let civ of this.civitas[type]) {
                civ.update();
            }
        }

        //refresh the live game object reference for every structure
        let castrum = this.castrum;
        let cType: keyof typeof castrum;
        for (cType in this.castrum) {
            for (let struc of castrum[cType]) {
                struc.update();
            }
        }
    }

    /**
     * Function that takes a creep object and makes a new creep based on that object
     * @param {Object} template An object that contains body, type, and memory
     * @param {boolean} rebirth whether or not this is a rebirth
     */
    initiate(template: RenewalTemplate, boost=true): void {
        let foundNexus = false;
        let generationIncremented = 0;
        if (this.nexusReservation <= Game.time) {
            //loop through the spawns until an available one is found
            for (let nexus of this.castrum[CASTRUM_TYPES.NEXUS]) {
                if (!(nexus instanceof Nexus)) continue;
                if (!nexus.spawning && !nexus.spawningThisTick) {
                    foundNexus = true;

                    //use the body stored in memory if it exists, as it can contain evolutions
                    let newBody = template.memory.body;
                    if (!newBody) {
                        newBody = template.body;
                    }

                    if (template.memory.generation !== undefined) {
                        template.memory.generation++;
                        generationIncremented++;
                    }

                    //todo: REDO the whole boosting process and chemist logic
                    // if (boost) {
                    //     //handle if the creep will be boosted when it spawns
                    //     let boostType = this.prepareBoosts(template.type, newBody);
                    //     if (boostType !== undefined) {
                    //         template.memory.boost = boostType;
                    //     }
                    // }

                    let success = nexus.spawnCreep(newBody, template.type, { ...template.memory });

                    if (success == OK) {
                        //don't try spawning on another spawn
                        break;
                    } else {
                        //so we can reschedule
                        foundNexus = false;
                    }
                }
            }
        }

        if (!foundNexus) {
            //decrement it back down
            if (template.memory.generation !== undefined) {
                template.memory.generation -= generationIncremented;
            }
            //if the request fails, schedule it for 5 ticks in the future
            let task = "global.Imperator.administrators[objArr[0]].supervisor.initiate(objArr[1]);";
            Director.schedule(this.room, Game.time + 5, task, [this.room, {...template}]);
        }
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
        if (!Informant.getWrapper(creep.id)) {
            let createObjStr = "this.civitas[\"" + creep.memory.type + "\"].push(new " + creep.memory.type.charAt(0).toUpperCase() +
                creep.memory.type.slice(1) + "(Game.creeps[\"" + creep.name + "\"]));";

            eval(createObjStr);
            return true;
        }
        return false;
    }

    /**
     * Delete the wrapper holding the dead creep
     * @param {Civitas} civitas
     */
    dismiss(civitasType: Civitas): void {
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
        if (type === CASTRUM_TYPES.CONTAINER || type === CASTRUM_TYPES.EXTENSION || type === CASTRUM_TYPES.ROAD || type === CASTRUM_TYPES.UNDEFINED) {
            throw Error('Primitive types cannot be decommissioned')
        }
        let origArr = this.castrum[type];
        let index = origArr.indexOf(castrumType as any);
        if (index >= 0) origArr.splice(index, 1);
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
        }
    }

    get emptyPrimitives() {
        return {
            [CASTRUM_TYPES.CONTAINER]: [],
            [CASTRUM_TYPES.EXTENSION]: [],
            [CASTRUM_TYPES.ROAD]: []
        }
    }

    /**
     * Getter to return the paired executive
     * @returns Executive
     */
    get executive(): Executive {
        return global.Imperator.administrators[this.room].executive;
    }

    get containers(): StructureContainer[] {
        if (this._primitives[CASTRUM_TYPES.CONTAINER].length === 0) {
            let containers: StructureContainer[] = [];
            this.primitives[CASTRUM_TYPES.CONTAINER].forEach(function(s) {
                let liveObj = Game.getObjectById(s) || undefined;
                if (liveObj !== undefined) containers.push(liveObj);
            })
            this._primitives[CASTRUM_TYPES.CONTAINER] = containers;
        }
        return this._primitives[CASTRUM_TYPES.CONTAINER];
    }

    get extensions(): StructureExtension[] {
        if (this._primitives[CASTRUM_TYPES.EXTENSION].length === 0) {
            let extensions: StructureExtension[] = [];
            this.primitives[CASTRUM_TYPES.EXTENSION].forEach(function(s) {
                let liveObj = Game.getObjectById(s) || undefined;
                if (liveObj !== undefined) extensions.push(liveObj);
            })
            this._primitives[CASTRUM_TYPES.EXTENSION] = extensions;
        }
        return this._primitives[CASTRUM_TYPES.EXTENSION];
    }

    get roads(): StructureRoad[] {
        if (this._primitives[CASTRUM_TYPES.ROAD].length === 0) {
            let roads: StructureRoad[] = [];
            this.primitives[CASTRUM_TYPES.ROAD].forEach(function(s) {
                let liveObj = Game.getObjectById(s) || undefined;
                if (liveObj !== undefined) roads.push(liveObj);
            })
            this._primitives[CASTRUM_TYPES.ROAD] = roads;
        }
        return this._primitives[CASTRUM_TYPES.ROAD];
    }
}
