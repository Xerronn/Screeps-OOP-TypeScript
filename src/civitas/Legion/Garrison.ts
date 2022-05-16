import Chronicler from 'controllers/Chronicler';
import Legionnaire from './Legionnaire'

export default class Garrison extends Legionnaire {
    constructor(garrison: Creep) {
        super(garrison);
    }

    update() {
        if (!super.update()) {
            //creep is dead, set flag so a new one can be spawned
            Chronicler.writeRemoteGarrisoned(this.spawnRoom, this.assignedRoom, false);
            return false;
        }
        //attributes that change tick to tick
        return true;
    }

    run() {
        if (!this.arrived) {
            return this.march(this.assignedRoom);
        }

        let target: AnyOwnedStructure | AnyCreep | undefined = Game.rooms[this.room].find(FIND_HOSTILE_CREEPS, {
            filter: (creep) => creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0
        })[0];
        if (target === undefined) {
            target = Game.rooms[this.room].find(FIND_HOSTILE_STRUCTURES)[0];
        } else if (target.getActiveBodyparts(ATTACK) === 0 && target.getActiveBodyparts(RANGED_ATTACK) === 0) {
            target = undefined;
        }
        if (target === undefined) {
            this.conclude();
            if (!this.medic()) this.garrison();
        } else {
            this.kill(target);
            this.killRanged(target);
            this.liveObj.heal(this.liveObj);
        }
        return;
    }

    /**
     * Method to move towards middle of the room and hold position
     */
    garrison() {
        let position = new RoomPosition(25,25, this.assignedRoom);
        if (!this.pos.inRangeTo(position, 10)) {
            this.liveObj.moveTo(position);
        }
    }

    /**
     * Method to finish up garrison work
     */
    conclude() {
        Chronicler.writeRemoteStatus(this.spawnRoom, this.assignedRoom, REMOTE_STATUSES.CLAIMED);
    }
}