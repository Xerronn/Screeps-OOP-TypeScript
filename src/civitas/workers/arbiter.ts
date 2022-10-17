import Conduit from 'castrum/Conduit';
import { WorkerMemory } from './Worker';
import Host from './Host';
import Chronicler from 'controllers/Chronicler';

interface ArbiterMemory extends WorkerMemory {
    linkId?: Id<StructureLink>,
    storageId?: Id<StructureStorage>,
    terminalId?: Id<StructureTerminal>
}
export default class Arbiter extends Host {
    memory: ArbiterMemory;

    station: Position;
    conduit?: Conduit;
    link?: StructureLink;
    storage?: StructureStorage;
    terminal?: StructureTerminal;

    constructor(arbiter: Creep) {
        super(arbiter);

        let mainAnchor = Chronicler.readSchema(this.room).main.anchor;
        this.station = {x: mainAnchor.x + 1, y: mainAnchor.y + 1};
        this.conduit = this.supervisor.controllerLink;
        this.storage = Game.rooms[this.room].storage;
        this.terminal = Game.rooms[this.room].terminal;
    }

    update(): boolean {
        if (!super.update()) {
            //creep is dead
            return false;
        }
        //attributes that will change tick to tick
        this.storage = Game.rooms[this.room].storage;
        this.terminal = Game.rooms[this.room].terminal;

        //supervisor makes a new wrapper whenever a construction site is finished
        this.conduit = this.supervisor.storageLink;
        this.link = this.conduit?.liveObj;

        return true;
    }

    run(): boolean {
        if (this.ticksToLive < 2) this.evolve();

        if (!this.position()) return true;

        // /**
        //  * Empty stores of minerals before dealing with minerals
        //  */
        // for (let res in this.store) {
        //     if (res !== RESOURCE_ENERGY && this.store[res] > 0) {
        //         this.liveObj.transfer(this.storage, res);
        //     }
        // }

        /**
         * Link Management. Keep the link at zero except when it requests to be filled
         */
        if ((this.link !== undefined && this.link.store.getUsedCapacity(RESOURCE_ENERGY) != 0) || this.conduit?.needsFilling == true) {
            if (this.conduit?.needsFilling == true) {
                if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "withdrawStorage" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
                    this.memory.task = "withdrawStorage";
                    if (!this.withdrawStorage()) this.withdrawTerminal();
                    return true;
                }
                this.memory.task = "depositLink";
                this.depositLink();
                return true;
            } else {
                if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "withdrawLink" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
                    this.memory.task = "withdrawLink";
                    this.withdrawLink();
                    return true;
                }
                this.memory.task = "depositStorage";
                this.depositStorage();
                return true;
            }
        }

        /**
         * Terminal Management. Puts energy into the terminal until it reaches 20k stored
         */
        let energyTarget = 25000 //global.Vendor.getTarget(RESOURCE_ENERGY);
        if (this.terminal && this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < energyTarget) {
            if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
                this.memory.task = "withdraw";
                let amount = energyTarget - this.terminal.store.getUsedCapacity(RESOURCE_ENERGY);
                let tripAmount = Math.min(amount, this.store.getFreeCapacity(RESOURCE_ENERGY));
                this.withdrawStorage(false, tripAmount);
                return true;
            } else {
                this.memory.task = "deposit";
                this.depositTerminal();
                return true;
            }
        } else if (this.terminal && this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > energyTarget) {
            if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
                this.memory.task = "withdraw";
                let amount = this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) - energyTarget;
                let tripAmount = Math.min(amount, this.store.getFreeCapacity(RESOURCE_ENERGY));
                this.withdrawTerminal(tripAmount);
                return true;
            } else {
                this.memory.task = "deposit";
                this.depositStorage();
                return true;
            }
        }

        // /**
        //  * Empty stores of energy before dealing with minerals
        //  */
        // if (this.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        //     this.depositStorage();
        // }

        // /**
        //  * Keep terminal full of minerals only
        //  */
        // if (this.terminal && Object.keys(this.terminal.store).length > global.Vendor.resources.length) {
        //     for (let res in this.terminal.store) {
        //         if (!global.Vendor.resources.includes(res)) {
        //             if (this.store.getUsedCapacity(res) == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity(res) > 0)) {
        //                 this.memory.task = "withdraw";
        //                 this.liveObj.withdraw(this.terminal, res);
        //                 return;
        //             } else {
        //                 this.memory.task = "deposit";
        //                 this.liveObj.transfer(this.storage, res);
        //                 return;
        //             }
        //         }
        //     }
        // }
        return false;
    }

    /**
     * Move arbiter to its position in the main stamp
     */
    position(): boolean {
        if (this.pos.x !== this.station.x || this.pos.y !== this.station.y) {
            let position = new RoomPosition(this.station.x, this.station.y, this.room);
            this.liveObj.travelTo(position);
            return false
        }

        return true
    }

    /**
     * Method that takes energy from link
     */
    withdrawLink(numEnergy?: number): boolean {
        if (this.link === undefined) return false;
        if (numEnergy !== undefined) {
            this.liveObj.withdraw(this.link, RESOURCE_ENERGY, numEnergy);
        } else {
            this.liveObj.withdraw(this.link, RESOURCE_ENERGY);
        }
        return true;
    }

    /**
     * Overloaded withdrawStorage with no moves
     */
    withdrawStorage(buffer: boolean = false, numEnergy?: number): boolean {
        if (this.storage === undefined || this.storage.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return false;
        if (numEnergy !== undefined) {
            this.liveObj.withdraw(this.storage, RESOURCE_ENERGY, numEnergy);
        } else {
            this.liveObj.withdraw(this.storage, RESOURCE_ENERGY);
        }
        return true;
    }

    /**
     * Withdraw energy from terminal
     */
    withdrawTerminal(numEnergy?: number): boolean {
        if (this.terminal === undefined) return false;
        if (numEnergy !== undefined) {
            this.liveObj.withdraw(this.terminal, RESOURCE_ENERGY, numEnergy);
            //global.Vendor.balances[this.room][RESOURCE_ENERGY] -= numEnergy;
        } else {
            this.liveObj.withdraw(this.terminal, RESOURCE_ENERGY);
            //global.Vendor.balances[this.room][RESOURCE_ENERGY] -= numEnergy;
        }
        return true;
    }

    /**
     * Method that gives energy to link
     */
    depositLink(numEnergy?: number): boolean {
        if (this.link === undefined) return false;
        if (numEnergy !== undefined) {
            this.liveObj.transfer(this.link, RESOURCE_ENERGY, numEnergy);
        } else {
            this.liveObj.transfer(this.link, RESOURCE_ENERGY);
        }
        return true;
    }

    /**
     * Move to storage and deposit all stored energy
     */
    depositStorage(numEnergy=undefined): boolean {
        if (this.storage === undefined) return false;
        if (numEnergy !== undefined) {
            this.liveObj.transfer(this.storage, RESOURCE_ENERGY, numEnergy);
        } else {
            this.liveObj.transfer(this.storage, RESOURCE_ENERGY);
        }
        return true;
    }

    /**
     * Move to terminal and deposit all stored energy
     */
    depositTerminal(numEnergy=undefined): boolean {
        if (this.terminal === undefined) return false;
        if (numEnergy !== undefined) {
            this.liveObj.transfer(this.terminal, RESOURCE_ENERGY, numEnergy);
            //increment balances in the vendor as energy is added
            //global.Vendor.balances[this.room][RESOURCE_ENERGY] += numEnergy;
        } else {
            this.liveObj.transfer(this.terminal, RESOURCE_ENERGY);
            //increment balances in the vendor as energy is added
            //global.Vendor.balances[this.room][RESOURCE_ENERGY] += this.store.getUsedCapacity(RESOURCE_ENERGY);
        }
        return true;
    }

    /**
     * Evolve the arbiter as it has more responsibilities
     */
    evolve(): boolean {
        let liveRoom = Game.rooms[this.room];
        let newBody: BodyPartConstant[] = [];
        if (liveRoom.controller === undefined) return false;
        if (liveRoom.controller.level >= 6 && liveRoom.terminal) {
            //once the room has a terminal
            newBody= [
                //400 carry capacity
                CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE
            ]
        }
        if (liveRoom.controller.level == 8) {
            //800 carry capacity
            newBody = [
                CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                MOVE
            ]
        }

        if (newBody.length > this.memory.body.length) {
            this.memory.body = newBody;
            this.liveObj.suicide();
        }
        return true;
    }
}
