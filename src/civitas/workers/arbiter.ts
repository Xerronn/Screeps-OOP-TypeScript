import Conduit from 'castrum/Conduit';
import { WorkerMemory } from './Worker';
import Host from './Host';
import Chronicler from 'controllers/Chronicler';

const TERMINAL_ENERGY_TARGET = 25000;

interface ArbiterMemory extends WorkerMemory {
    linkId?: Id<StructureLink>,
    storageId?: Id<StructureStorage>,
    terminalId?: Id<StructureTerminal>
}
export default class Arbiter extends Host {
    memory: ArbiterMemory;

    storageConduit?: Conduit;
    controllerConduit?: Conduit;
    storage?: StructureStorage;
    terminal?: StructureTerminal;

    constructor(arbiter: Creep) {
        super(arbiter);

        this.idleSpot = this.supervisor.arbiterSpot;
        this.storageConduit = this.supervisor.storageLink;
        this.controllerConduit = this.supervisor.controllerLink;
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
        this.storageConduit = this.supervisor.storageLink;
        this.controllerConduit = this.supervisor.controllerLink;

        return true;
    }

    run(): boolean {
        if (this.ticksToLive < 2) this.evolve();

        if (!this.returnToIdleSpot()) return true;
        /**
         * Fill stores
         */
        if (this.store.getUsedCapacity() === 0) {
            if (this.controllerConduit?.shouldFill === 0) {
                return this.withdrawLink();
            }
            if ((this.controllerConduit?.shouldFill || 0) > 10 && (this.storageConduit?.shouldFill || 0) > 0 ) {
                return this.withdrawStorage();
            }
            if (this.terminal && this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < TERMINAL_ENERGY_TARGET) {
                let withdrawAmount = this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) - TERMINAL_ENERGY_TARGET;
                return this.withdrawStorage(false, RESOURCE_ENERGY, withdrawAmount);
            }
            if (this.terminal && this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > TERMINAL_ENERGY_TARGET) {
                return this.withdrawTerminal(this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) - TERMINAL_ENERGY_TARGET);
            }
            if (this.storage && this.terminal && this.terminal.store.getFreeCapacity() > 0 && this.storage.store.getUsedCapacity(RESOURCE_ENERGY) < this.storage.store.getUsedCapacity()) {
                for (let resType in this.storage.store) {
                    if (resType == RESOURCE_ENERGY) continue;
                    return this.withdrawStorage(false, resType as ResourceConstant);
                }
            }
        }

        /**
         * Empty stores
         */
        for (let resType in this.store) {
            if (resType == RESOURCE_ENERGY) {
                //deposit into link if needed
                if ((this.controllerConduit?.shouldFill || 0) > 10 && (this.storageConduit?.shouldFill || 0) > 0 ) {
                    return this.depositLink();
                }
                if (this.terminal && this.terminal.store.getUsedCapacity(RESOURCE_ENERGY) < TERMINAL_ENERGY_TARGET) {
                    this.depositTerminal(RESOURCE_ENERGY, TERMINAL_ENERGY_TARGET - this.terminal.store.getUsedCapacity(RESOURCE_ENERGY));
                    return true;
                }
                if (this.storage) {
                    this.depositStorage();
                    return true;
                }
                continue;
            }
            this.depositTerminal(resType as ResourceConstant);
            return true;
        }
        
        return false;
    }

    /**
     * Method that takes energy from link
     */
    withdrawLink(): boolean {
        if (!this.storageConduit || !this.storageConduit.liveObj) return false;
        this.liveObj.withdraw(this.storageConduit.liveObj, RESOURCE_ENERGY);
        return true;
    }

    /**
     * Overloaded withdrawStorage with no moves
     */
    withdrawStorage(buffer: boolean = false, resource: ResourceConstant = RESOURCE_ENERGY, amount?: number): boolean {
        if (this.storage === undefined || this.storage.store.getUsedCapacity(resource) === 0) return false;
        if (amount !== undefined) {
            this.liveObj.withdraw(this.storage, resource, amount);
        } else {
            this.liveObj.withdraw(this.storage, resource);
        }
        return true;
    }

    /**
     * Withdraw energy from terminal
     */
    withdrawTerminal(amount?: number): boolean {
        if (this.terminal === undefined) return false;
        if (amount !== undefined) {
            let adjustedAmount = Math.min(amount, this.store.getFreeCapacity(RESOURCE_ENERGY))
            this.liveObj.withdraw(this.terminal, RESOURCE_ENERGY, adjustedAmount);
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
    depositLink(): boolean {
        if (!this.storageConduit || !this.storageConduit.liveObj) return false;
        this.liveObj.transfer(this.storageConduit.liveObj, RESOURCE_ENERGY);
        return true;
    }

    /**
     * Move to storage and deposit all stored energy
     */
    depositStorage(): boolean {
        if (this.storage === undefined) return false;
        this.liveObj.transfer(this.storage, RESOURCE_ENERGY);
        return true;
    }

    /**
     * Deposit resources into terminal
     */
    depositTerminal(resource: ResourceConstant, amount?: number): boolean {
        if (this.terminal === undefined) return false;
        if (amount !== undefined) {
            let adjustedAmount = Math.min(amount, this.store.getUsedCapacity(resource));
            this.liveObj.transfer(this.terminal, resource, adjustedAmount);
            //increment balances in the vendor as energy is added
            //global.Vendor.balances[this.room][RESOURCE_ENERGY] += numEnergy;
        } else {
            this.liveObj.transfer(this.terminal, resource);
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
