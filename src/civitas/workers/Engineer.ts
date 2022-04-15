import Chronicler from "controllers/Chronicler";
import Miner from "./Miner";

export default class Engineer extends Miner {
    constructor(engineer: Creep) {
        super(engineer);
    }

    run(): boolean {
        if (this.arrived === false) {
            return this.march(this.assignedRoom);
        }

        if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "harvest" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
            this.memory.task = "harvest";
            if (!this.noPillage) {
                if (this.pillage()) return true;
            }
            this.harvest();
        }
        else if (Chronicler.readBastionsFilled(this.room) === false) {
            this.memory.task = "fillTowers";
            this.fillTowers();
        } else if (Chronicler.readExtensionsFilled(this.room) === false) {
            this.memory.task = "fillExtensions";
            this.fillExtensions();
        } else if (this.memory.buildTarget !== undefined || Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
            this.memory.task = "build";
            this.build();
        } else if (this.remote) {
            delete this.memory.generation;
            this.liveObj.suicide();
        } else if (!Game.rooms[this.room].storage) {
            this.memory.task = "upgradeController";
            this.upgradeController();
        } else {
            this.depositStorage();
        }
        
        //evolve the creep to meet expanding energy availability
        if (this.ticksToLive < 2) {
            this.evolve();
        }

        return true;
    }

    harvest(): boolean {
        if (this.source === undefined) return false;
        if (this.pos.inRangeTo(this.source, 1)) {
            this.liveObj.harvest(this.source);
        } else {
            //this.liveObj.travelTo(this.source, {allowSwap: false});
            this.liveObj.moveTo(this.source);
        }
        return true;
    }

    evolve(): void {
        if (Game.rooms[this.memory.spawnRoom].energyCapacityAvailable >= 500) {
            this.memory.body = [
                WORK, WORK,
                CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE
            ];
        }
        if (Game.rooms[this.memory.spawnRoom].energyCapacityAvailable >= 750) {
            this.memory.body = [
                WORK, WORK, WORK,
                CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
        }
        if (Game.rooms[this.memory.spawnRoom].energyCapacityAvailable >= 1000) {
            this.memory.body = [
                WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
        }
    }
}
