//administrator imports
import { Informant } from './informant';
import { TaskMaster } from './taskmaster';
import { Executive } from './executive';

//creep imports
import { Civitas } from '../civitas/civitas';

//structure imports
import { Castrum } from '../castrum/castrum';
import { Conduit } from '../castrum/conduit';
import { Workshop } from '../castrum/workshop';
import { Nexus } from '../castrum/nexus';
import { Bastion } from '../castrum/bastion';
import { Market } from '../castrum/market';

export class Supervisor {
    room: string;
    civitas: {[creepType: string]: Array<Civitas>};
    castrum: {[structureType: string]: Array<Castrum>};

    nexusReservation: number;
    workshopReservation: number;

    controllerLink: Conduit | undefined;
    storageLink: Conduit | undefined;
    reagentWorkshops: Array<Workshop>;
    productWorkshops: Array<Workshop>;

    constructor(room: string) {
        this.room = room;

        this.castrum = {};
        for (let castrumType of Object.values(CASTRUM_TYPES)) {
            this.castrum[castrumType] = [];
        }

        this.civitas = {};
        for (let civitasType of Object.values(CIVITAS_TYPES)) {
            this.civitas[civitasType] = [];
        }

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
        //initialize all structures in the room to their respective classes
        this.castrum = {};
        for (var structure of thisRoom.find(FIND_MY_STRUCTURES)) {

            let castrumType = Informant.mapGameToClass(structure.structureType);
            if (castrumType !== undefined) {
                !(castrumType in this.castrum) && (this.castrum[castrumType] = []);
                let createObjStr = "this.castrum[\"" + castrumType + "\"].push(new " + castrumType.charAt(0).toUpperCase() +
                    castrumType.slice(1) + "(structure));";
                eval(createObjStr);
            }
        }

        if (onlyStructures) return;

        //initialize all creeps in the room to their respective classes
        this.civitas = {};
        for (let creepMem of _.filter(Memory.creeps, c => c.spawnRoom == this.room)) {
            !(creepMem.type in this.civitas) && (this.civitas[creepMem.type] = []);

            if (Game.creeps[creepMem.name]) {
                let createObjStr = "this.civitates[\"" + creepMem.type + "\"].push(new " + creepMem.type.charAt(0).toUpperCase() +
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
        try {
            //first all creeps
            for (var type of Object.keys(this.civitas)) {
                for (var civ of this.civitas[type]) {
                    if (civ.liveObj.spawning) continue;
                    let startcpu = Game.cpu.getUsed()
                    civ.run();
                    let usedCpu = Game.cpu.getUsed() - startcpu;

                    if (usedCpu > 0.3 && global.logger == true) {
                        console.log(civ.name);
                        console.log(usedCpu);
                    }
                }
            }

            //then all structures
            for (var type of Object.keys(this.castrum)) {
                for (var struc of this.castrum[type]) {
                    //block workshops from running when they are reserved
                    if (type !== "workshop" || this.workshopReservation < Game.time) {
                        struc.run();
                    }
                }
            }
        } catch (roomErr: any) {
            let errorMessage = `<b style='color:red;'>Room FAILURE with message ${roomErr.message} at ${roomErr.stack}</b>`
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
        for (let type in this.civitas) {
            for (let civ of this.civitas[type]) {
                civ.update();
            }
        }

        //refresh the live game object reference for every structure
        for (let type in this.castrum) {
            for (let struc of this.castrum[type]) {
                struc.update();
            }
        }
    }

    /**
     * Function that takes a creep object and makes a new creep based on that object
     * @param {Object} template An object that contains body, type, and memory
     * @param {boolean} rebirth whether or not this is a rebirth
     */
     initiate(template: RenewalTemplate, boost=true) {
        let foundNexus = false;
        let generationIncremented = 0;

        if (this.nexusReservation <= Game.time) {
            //loop through the spawns until an available one is found
            for (let nexus of this.castrum[CASTRUM_TYPES.NEXUS]) {
                if (!(nexus instanceof Nexus)) continue;
                if (!nexus.spawning && !nexus.spawningThisTick) {

                    //arbiters must be spawned from the prime nexus
                    if (template.type == CIVITAS_TYPES.ARBITER) {
                        if (!nexus.prime) continue;
                    }
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
            TaskMaster.schedule(this.room, Game.time + 5, task, [this.room, {...template}]);
        }
    }

    /**
     * Function to wrap a newly created creep
     * @param {String} creepName Name of the creep
     * @returns {Boolean} if the new wrapper was created
     */
    wrapCreep(creepName: string): boolean {
        let creep = Game.creeps[creepName];
        if (!this.civitas[creep.memory.type]) {
            this.civitas[creep.memory.type] = [];
        }
        //check if the creep has already been wrapped
        if (!Informant.getWrapper(creep.id)) {
            let createObjStr = "this.civitates[\"" + creep.memory.type + "\"].push(new " + creep.memory.type.charAt(0).toUpperCase() +
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
        let index = origArr.indexOf(civitasType);
        if (index >= 0) origArr.splice(index, 1);
        delete Memory.creeps[civitasType.memory.name];
    }

    /**
     * Delete the class holding the dead tower
     * @param {Castrum} castrumType
     */
    decommission(castrumType: Castrum): void {
        let origArr = this.castrum[castrumType.type];
        let index = origArr.indexOf(castrumType);
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

    /**
     * function to return the room's executive
     * @returns Executive
     */
    getExecutive(): Executive {
        return global.Imperator.administrators[this.room].executive;
    }
}
