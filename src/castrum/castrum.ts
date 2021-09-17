import { Informant } from 'administrators/informant';
import { GameObj } from '../gameObj';

export abstract class Castrum extends GameObj {
    //gameObj attributes
    id: Id<Structure>;
    liveObj: Structure;
    pos: RoomPosition;
    room: string;
    hits: number;
    hitsMax: number;

    //basic structure attributes
    type: CASTRUM_TYPES;

    constructor(structure: Structure) {
        super();
        this.liveObj = Game.structures[structure.id];

        this.id = structure.id;
        this.type = Informant.mapGameToClass(structure.structureType);

        //attributes that change tick to tick
        this.pos = structure.pos;
        this.room = structure.room.name;
        this.hits = structure.hits;
        this.hitsMax = structure.hitsMax;
    }

    update(): boolean {
        this.liveObj = Game.structures[this.id];

        if (this.liveObj === null) return false //structure is dead
        this.pos = this.liveObj.pos;
        this.room = this.liveObj.room.name;
        this.hits = this.liveObj.hits;
        this.hitsMax = this.liveObj.hitsMax;
        return true;
    }

    run(): boolean {
        return false
    }
}
