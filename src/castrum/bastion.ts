import Chronicler from 'controllers/Chronicler';
import Castrum from './Castrum';

export default class Bastion extends Castrum {
    id: Id<StructureTower>;
    liveObj: StructureTower;
    store: Store<RESOURCE_ENERGY, false>

    repairTargets: Id<StructureRoad | StructureContainer>[];

    constructor(bastion: StructureTower) {
        super(bastion);
        this.id = bastion.id;
        this.liveObj = bastion;
        this.store = this.liveObj.store;

        this.repairTargets = [];
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
        // find new repair targets every 100 ticks
        if (Game.time % 100) {
            this.findRepairTargets();
        }
        if (!this.simpleAttack()) {     //todo: better attack implementation
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
            this.liveObj.attack(closestHostile);
            return true;
        }
        return false;
    }

    findRepairTargets() {
        //erase old repairTargets
        this.repairTargets = [];

        let roads = this.supervisor.roads;
        let containers = this.supervisor.containers;
        let repairables = roads.concat(containers as any);

        let sortedRepairables = _.sortBy(repairables, (struc) => struc.hits/struc.hitsMax).map(obj => obj.id);
        this.repairTargets = sortedRepairables;
    }

    repair() {
        let target = undefined;
        let tempTargets = [...this.repairTargets];

        let index = 0;
        for (let id of tempTargets) {
            let liveObj = Game.getObjectById(id)
            if (!liveObj) continue;
            if (liveObj.hits < liveObj.hitsMax) {
                target = liveObj;
                break;
            } else {
                this.repairTargets.splice(index, 1);
                index++;
            }
        }

        if (target && this.store.getUsedCapacity(RESOURCE_ENERGY) > 250) {
            this.liveObj.repair(target);
        }
    }
}
