import Chronicler from "controllers/Chronicler";
import Worker from "./Worker";

export default class Contractor extends Worker {
    constructor(contractor: Creep) {
        super(contractor);
    }

    /**
     * Logic to run every tick
     */
     run(): boolean {
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
            this.memory.task = "withdraw";
            this.withdrawStorage();
        } else if (Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
            this.memory.task = "build";
            this.build();
        } else {
            if (this.memory.generation !== undefined && this.ticksToLive < 2) {
                this.conclude();
                return false;
            }
            this.memory.task = "upgrade";
            this.upgradeController();
        }
        return true;
    }

    /**
     * Method to remove rebirth and lower Chronicler contractor count
     */
    conclude() {
        //lower count by one
        Chronicler.writeIncrementNumContractors(this.room, -1);
        delete this.memory.generation;
    }
}

