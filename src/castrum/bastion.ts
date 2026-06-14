import Chronicler from 'controllers/Chronicler';
import Castrum from './Castrum';
import Road from './Road';
import Container from './Container';

export default class Bastion extends Castrum {
    id: Id<StructureTower>;
    liveObj: StructureTower;
    store: Store<RESOURCE_ENERGY, false>;

    attacking: boolean;
    repairTarget?: Road | Container;

    constructor(bastion: StructureTower) {
        super(bastion);
        this.id = bastion.id;
        this.liveObj = bastion;
        this.store = this.liveObj.store;
        this.attacking = false;
    }

    update(): boolean {
        if (!super.update()) {
            //structure got killed
            return false;
        }
        this.liveObj = Game.structures[this.id] as StructureTower;
        this.store = this.liveObj.store;
        return true;
    }

    run(): boolean {
        //set tower filled flag
        if (this.store.getFreeCapacity(RESOURCE_ENERGY) > this.store.getCapacity(RESOURCE_ENERGY) / 4) {
            Chronicler.writeBastionsFilled(this.room, false);
        }
        if (!this.simpleAttack()) {     //todo: better attack implementation
            this.attacking = false;
            this.repair();
        }
        return true;
    }

    /**
     * Simple attack method attacking the closest enemy
     * @returns if tower is attacking
     */
     simpleAttack(): boolean {
        var closestHostile = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile !== null) {
            this.attacking = true;
            this.liveObj.attack(closestHostile);
            return true;
        }
        return false;
    }

    repair() {
        if (this.repairTarget) {
            if (this.repairTarget.hits < this.repairTarget.hitsMax) {
                this.liveObj.repair(this.repairTarget.liveObj);
                return;
            }
            this.repairTarget = undefined;
        } 
    }

    /**
     * Method to heal a creep, only when not attacking
     * @param creep 
     */
    heal(creep: Creep) {
        if (this.attacking === false) {
            this.liveObj.heal(creep);
        }
    }
}
