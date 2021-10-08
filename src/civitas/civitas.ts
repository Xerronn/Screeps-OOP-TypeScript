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
    body: string[];
    spawning: boolean;
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
        this.pos = civitas.pos;
        this.room = civitas.room.name;
        this.hits = civitas.hits;
        this.spawning = civitas.spawning;
    }

    update(): boolean {
        this.liveObj = Game.creeps[this.name];
        if (this.liveObj === null) return false; //creep is dead

        this.memory = this.liveObj.memory;
        this.pos = this.liveObj.pos;
        this.room = this.liveObj.room.name;
        this.hits = this.liveObj.hits;
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
}
