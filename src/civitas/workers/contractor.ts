import { Archivist } from "administrators/archivist";
import { Worker } from "./worker";

export class Contractor extends Worker {
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
     * build construction sites closest to storage
     */
     build(): boolean {
        let liveSite;
        if (this.memory.buildTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.buildTarget);
            if (tmpObj !== null) {
                liveSite = tmpObj;
            } else {
                //if the tmpObj is null, it means that the
                this.supervisor.wrap(true);
                delete this.memory.buildTarget;
            }
        }
        if (liveSite === undefined) {
            let sites = Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES);

            let storage = Game.rooms[this.room].storage;
            if (storage === undefined) {
                liveSite = this.pos.findClosestByRange(sites);
            } else {
                liveSite = storage.pos.findClosestByRange(sites);

            }

        }
        if (liveSite !== null) {
            this.memory.buildTarget = liveSite.id;
        } else return false;

        if (this.pos.inRangeTo(liveSite, 3)) {
            this.liveObj.build(liveSite);
        } else {
            this.liveObj.travelTo(liveSite);
        }
        return true;
    }

    /**
     * Method to remove rebirth and lower archivist contractor count
     */
    conclude() {
        //lower count by one
        Archivist.setNumContractors(this.room, Archivist.getNumContractors(this.room) - 1);
        delete this.memory.generation;
    }
}

