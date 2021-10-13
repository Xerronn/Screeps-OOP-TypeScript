import { Archivist } from 'administrators/archivist';
import { Castrum } from './castrum';

export class Bastion extends Castrum {
    id: Id<StructureTower>;
    liveObj: StructureTower;
    store: Store<RESOURCE_ENERGY, false>

    constructor(bastion: StructureTower) {
        super(bastion);
        this.id = bastion.id;
        this.liveObj = bastion;
        this.store = this.liveObj.store;
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
            Archivist.setTowersFilled(this.room, false);
        }
        //todo: repair and more complex targeting algo
        this.simpleAttack();
        //find new repair targets every 15 ticks
        // if (Game.time % 15) {
        //     this.findRepairTargets();
        // }

        // if (!this.simpleAttack()) {
        //     this.repair();
        // }
        return true;
    }

    /**
     * Simple attack method attacking the closest enemy
     * @returns if tower is attacking
     */
     simpleAttack(): boolean {
        var closestHostile = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile !== null) {
            this.liveObj.attack(closestHostile);
            return true;
        }
        return false;
    }
}
