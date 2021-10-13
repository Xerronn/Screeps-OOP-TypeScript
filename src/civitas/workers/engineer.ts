import { Miner } from "./miner";

export class Engineer extends Miner {
    constructor(engineer: Creep) {
        super(engineer);
    }

    run(): boolean {
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "harvest" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
            this.memory.task = "harvest";
            if (!this.noPillage) {
                if (this.pillage()) return true;
            }
            this.harvest();
        }
        else if (9 < 3/*Archivist.getTowersFilled(this.room) */) {
            this.memory.task = "fillTowers";
            this.fillTowers();
        } else if (!this.extensionsFilled) {
            this.memory.task = "fillExtensions";
            this.fillExtensions();
        } else if (Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
            this.memory.task = "build";
            this.build();
        } else {
            this.memory.task = "upgradeController";
            this.upgradeController();
        }

        //evolve the creep to meet expanding energy availability
        if (this.ticksToLive !== undefined && this.ticksToLive < 2) {
            this.evolve();
        }

        return true;
    }

    evolve(): void {
        if (Game.rooms[this.room].energyCapacityAvailable >= 500) {
            this.memory.body = [
                WORK, WORK,
                CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE
            ];
        }
        if (Game.rooms[this.room].energyCapacityAvailable >= 750) {
            this.memory.body = [
                WORK, WORK, WORK,
                CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
        }
        if (Game.rooms[this.room].energyCapacityAvailable >= 1000) {
            this.memory.body = [
                WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
        }
    }
}
