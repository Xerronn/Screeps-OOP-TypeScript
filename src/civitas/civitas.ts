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
    memory: CreepMemory;
    body: string[];
    
    constructor(creep: Creep) {
        super();
        this.liveObj = creep;
        
        this.id = creep.id;
        this.name = creep.name;
        this.hitsMax = creep.hitsMax;
        this.body = creep.body.map(b => b.type);
        
        //attributes that change every tick
        this.memory = creep.memory;
        this.pos = creep.pos;
        this.room = creep.room.name;
        this.hits = creep.hits;
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