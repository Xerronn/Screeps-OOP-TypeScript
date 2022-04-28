import Chronicler from "controllers/Chronicler";
import Miner from "./Miner";

export default class Engineer extends Miner {
    bootstrap: boolean;      //whether it should do more bootstrap tasks

    constructor(engineer: Creep) {
        super(engineer);
        
        this.bootstrap = Game.rooms[this.assignedRoom].controller?.my || false;
    }

    run() {
        if (this.arrived === false) {
            return this.march(this.assignedRoom);
        }

        if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "harvest" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
            this.memory.task = "harvest";
            if (!this.noPillage) {
                if (this.pillage()) return;
            }
            this.harvest();
        }
        else if (this.bootstrap && Chronicler.readBastionsFilled(this.assignedRoom) === false) {
            this.memory.task = "fillTowers";
            this.fillTowers();
        } else if (this.bootstrap && Chronicler.readExtensionsFilled(this.assignedRoom) === false) {
            this.memory.task = "fillExtensions";
            this.fillExtensions();
        } else if (this.memory.buildTarget !== undefined || Game.rooms[this.assignedRoom].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
            this.memory.task = "build";
            this.build();
        } else if (!this.bootstrap || Chronicler.readGameStage(this.assignedRoom) >= 4.1) {
            delete this.memory.generation;
            this.liveObj.suicide();
        } else if (Game.rooms[this.room].storage === undefined || Game.rooms[this.room].storage?.my === false) {
            this.memory.task = "upgradeController";
            this.upgradeController();
        } else {
            this.depositStorage();
        }
        
        //evolve the creep to meet expanding energy availability
        if (this.ticksToLive < 2 && !this.remote) {
            this.evolve();
        }

        return;
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
        if (Game.rooms[this.spawnRoom].energyCapacityAvailable >= 500) {
            this.memory.body = [
                WORK, WORK,
                CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE
            ];
        }
        if (Game.rooms[this.spawnRoom].energyCapacityAvailable >= 750) {
            this.memory.body = [
                WORK, WORK, WORK,
                CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
        }
        if (Game.rooms[this.spawnRoom].energyCapacityAvailable >= 1000) {
            this.memory.body = [
                WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ];
        }
    }
}
