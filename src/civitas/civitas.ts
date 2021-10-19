import { Executive } from 'administrators/executive';
import { Supervisor } from 'administrators/supervisor';
import { GameObj } from '../gameObj';

export abstract class Civitas extends GameObj {
    //gameObj attributes
    id: Id<Creep>;
    liveObj: Creep;
    pos: RoomPosition;
    room: string;
    hits: number;
    hitsMax: number;

    //basic creep attributes
    name: string;
    type: CivitasType | LegionType;;
    memory: CreepMemory;
    store: StoreDefinition;
    body: BodyPartConstant[];
    spawning: boolean;
    ticksToLive: number;
    remote?: boolean;

    constructor(civitas: Creep) {
        super();
        this.liveObj = civitas;

        this.id = civitas.id;
        this.name = civitas.name;
        this.type = civitas.memory.type;
        this.hitsMax = civitas.hitsMax;
        this.body = civitas.body.map(b => b.type);
        this.remote = civitas.memory.remote;

        //attributes that change every tick
        this.memory = civitas.memory;
        this.store = civitas.store;
        this.pos = civitas.pos;
        this.room = civitas.room.name;
        this.hits = civitas.hits;
        this.spawning = civitas.spawning;
        this.ticksToLive = civitas.ticksToLive || 1500;
    }

    update(): boolean {
        this.liveObj = Game.creeps[this.name];
        if (this.liveObj === undefined) {
            //only rebirth if the generation flag is there. If you want a creep to rebirth, set generation = 0 in the memory
            if (this.memory.generation !== undefined) {
                let template = {
                    "body": [...this.body],
                    "type": this.memory.type,
                    "memory": {...this.memory}
                };
                this.supervisor.initiate(template);
            }
            //delete this wrapper
            this.supervisor.dismiss(this);
            return false; //creep is dead
        }

        this.memory = this.liveObj.memory;
        this.store = this.liveObj.store;
        this.pos = this.liveObj.pos;
        this.room = this.liveObj.room.name;
        this.hits = this.liveObj.hits;
        this.ticksToLive = this.liveObj.ticksToLive || 1500;
        return true;
    }

    /**
     * Empty run method because this class is not meant to be instantiated
     * @returns {false}
     */
    run(): boolean {
        return false;
    }

    /**
     * Method to boost the creep with a already prepared lab
     * @param {string[]} boostType
     */
    boost(boostTypes: string[]) {
        // for (let boost of boostTypes) {
        //     let workshopId = global.Archivist.getBoostingWorkshops(this.memory.spawnRoom)[boost] || undefined;
        //     let workshop = global.Imperator.getWrapper(workshopId);
        //     if (!workshop) {
        //         continue;
        //     }

        //     if (this.pos.inRangeTo(workshop.liveObj, 1)) {
        //         workshop.liveObj.boostCreep(this.liveObj);
        //         workshop.boosting = false;
        //         let old = global.Archivist.getBoostingWorkshops(this.room);
        //         old[boost] = undefined;
        //         global.Archivist.setBoostingWorkshops(this.room, old);
        //         continue;
        //     } else {
        //         this.liveObj.travelTo(workshop.liveObj);
        //     }
        //     return true;
        // }
        // return false;
    }

    /**
     * Method that returns the number of active body parts on a creep
     * @param bodyPart Type of Body part to count
     * @returns number of body part
     */
    getActiveBodyParts(bodyPart: BodyPartConstant): number {
        return this.liveObj.getActiveBodyparts(bodyPart)
    }

    get supervisor(): Supervisor {
        return global.Imperator.administrators[this.memory.spawnRoom].supervisor;
    }

    get executive(): Executive {
        return global.Imperator.administrators[this.memory.spawnRoom].executive;
    }
}
