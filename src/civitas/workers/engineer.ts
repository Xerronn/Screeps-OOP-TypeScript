import { Archivist } from "administrators/archivist";
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
            //this.fillTowers();
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

        return true;
    }
}
