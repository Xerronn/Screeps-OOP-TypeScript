import Civitas from '../civitas'

export default class Legionnaire extends Civitas {
    constructor(emissary: Creep) {
        super(emissary);
    }

    run() {
        if (!this.arrived) {
            return this.march(this.assignedRoom);
        }

        let target = Game.rooms[this.room].find(FIND_HOSTILE_SPAWNS)[0];
        this.kill(target);
        return;
    }

    /**
     * Method to flee to home room when there is an invader or enemy
     */
    flee() {
        this.march(this.memory.spawnRoom);
    }

    /**
     * Method that travels to the room controller and reserves it
     */
    kill(spawn: StructureSpawn) {
        if (this.pos.inRangeTo(spawn, 1)) {
            this.liveObj.attack(spawn);
        } else {
            this.liveObj.travelTo(spawn);
        }
    }
}