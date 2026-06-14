import Informant from 'controllers/Informant';
import GameObj from '../GameObj';

export default abstract class Castrum extends GameObj {
    //default gameObj attributes
    id: Id<Structure>;
    liveObj: Structure;
    pos: RoomPosition;
    room: string;

    //attributes that update ever tick
    hits: number;
    hitsMax: number;

    //basic structure attributes
    type: CASTRUM_TYPES;
    structureType: BuildableStructureConstant;

    constructor(structure: Structure) {
        super();
        this.liveObj = Game.getObjectById(structure.id) as Structure;

        this.id = structure.id;
        this.type = Informant.mapGameToClass(structure.structureType);
        this.structureType = this.liveObj.structureType as BuildableStructureConstant;
        this.pos = structure.pos;
        this.room = structure.room.name;

        //attributes that change tick to tick
        this.hits = structure.hits;
        this.hitsMax = structure.hitsMax;
    }

    update(): boolean {
        this.liveObj = Game.getObjectById(this.id) as Structure;
        if (!this.liveObj) {
            this.supervisor.decommission(this);
            return false //structure is dead
        }
        this.hits = this.liveObj.hits;
        this.hitsMax = this.liveObj.hitsMax;
        return true;
    }

    run() {
        return;
    }
}
