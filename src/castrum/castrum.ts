import Informant from 'controllers/Informant';
import GameObj from '../GameObj';

import type Supervisor from 'administrators/Supervisor';
import type Executive from 'administrators/Executive';

export default abstract class Castrum extends GameObj {
    //default gameObj attributes
    id: Id<Structure>;
    liveObj: Structure;
    pos: RoomPosition;
    room: string;

    //attributes that update every tick
    hits: number;
    hitsMax: number;

    //basic structure attributes
    type: CASTRUM_TYPES;
    structureType: BuildableStructureConstant;

    hasVision: boolean;
    supervisor: Supervisor;

    constructor(supervisor: Supervisor, structure: Structure) {
        super();
        this.supervisor = supervisor;
        this.liveObj = Game.getObjectById(structure.id) as Structure;

        this.id = structure.id;
        this.type = Informant.mapGameToClass(structure.structureType);
        this.structureType = this.liveObj.structureType as BuildableStructureConstant;
        this.pos = structure.pos;
        this.room = structure.room.name;

        //attributes that change tick to tick
        this.hits = structure.hits;
        this.hitsMax = structure.hitsMax;
        this.hasVision = true;
    }

    update(): boolean {
        this.liveObj = Game.getObjectById(this.id) as Structure;
        if (!this.liveObj) {
            if (!Game.rooms[this.room]) {
                //no vision
                this.hasVision = false;
                return true;
            }
            return false //structure is dead
        }
        this.hasVision = true;
        this.hits = this.liveObj.hits;
        this.hitsMax = this.liveObj.hitsMax;
        return true;
    }

    run() {
        return;
    }

    decommission() {
        this.supervisor.decommission(this);
        this.liveObj.destroy();
        return;
    }
}
