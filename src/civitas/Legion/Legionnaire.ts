import Civitas from '../civitas'

interface LegionMemory extends CreepMemory {
    healTarget?: Id<Creep>;
}

export default class Legionnaire extends Civitas {
    memory: LegionMemory;

    constructor(legionnaire: Creep) {
        super(legionnaire);
    }

    run() {
        if (!this.arrived) {
            return this.march(this.assignedRoom);
        }

        let target = Game.rooms[this.room].find(FIND_HOSTILE_SPAWNS)[0];
        if (target) {
            this.kill(target);
        }
        return;
    }

    /**
     * Method that melee attacks something
     */
    kill(target: AnyCreep | Structure) {
        if (this.pos.inRangeTo(target, 1)) {
            this.liveObj.attack(target);
        } else {
            this.liveObj.travelTo(target);
        }
    }

    /**
     * Method to ranged attack a target
     */
    killRanged(target: AnyCreep | Structure) {
        if (this.pos.inRangeTo(target, 3)) {
            if (this.pos.inRangeTo(target, 1)) {
                this.liveObj.rangedMassAttack();
            } else {
                this.liveObj.rangedAttack(target);
                this.liveObj.moveTo(target);
            }
        } else {
            this.liveObj.moveTo(target);
        }
    }

    /**
     * Method for a creep to heal others
     */
     medic() {
        let targetCreep = Game.getObjectById(this.memory.healTarget || '' as Id<Creep>) || undefined;

        if (targetCreep === undefined || targetCreep.hits == targetCreep.hitsMax) {
            let myCreeps = Game.rooms[this.assignedRoom].find(FIND_MY_CREEPS, {
                filter : (creep) => creep.hits < creep.hitsMax});
            if (!myCreeps || myCreeps.length == 0) return false;
            
            targetCreep = this.pos.findClosestByRange(myCreeps) || undefined;
            if (targetCreep !== undefined) {
                this.memory.healTarget = targetCreep.id;
            }
        }
        if (targetCreep !== undefined) {
            if (this.pos.inRangeTo(targetCreep, 1)) {
                this.liveObj.heal(targetCreep);
            } else {
                this.liveObj.moveTo(targetCreep);
            }
        }
        return true;
    }
}