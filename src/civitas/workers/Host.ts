import Capacitor from 'castrum/Capacitor';
import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Worker from './Worker';

export default class Host extends Worker {
    idleSpot: RoomPosition;
    capacitorPaths: {[id: string]: RoomPosition[]};     //lazy cache of paths to each capacitor
    renewSpawnId?: Id<StructureSpawn>;
    currentCapacitor?: Capacitor;
    evolved: boolean;

    constructor(host: Creep) {
        super(host)
        this.evolved = false;
        this.idleSpot = this.getIdleSpot();
        this.capacitorPaths = {};
    }
    
    run(): boolean {
        if (this.memory.generation !== undefined && (this.ticksToLive < 300 || this.memory.task == "renew" || this.memory.task == "renewFill")) {
            //start the loop by setting task to rewnewFill
            //this task will block spawning, but keep filling
            //until reaching the required energy for a full renew
            if (this.memory.task != "renew") {
                this.memory.task = "renewFill";
            }
            this.renew();
            return true;
        }
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < EXTENSION_ENERGY_CAPACITY[Game.rooms[this.room].controller?.level || 7] ||
            (this.memory.task == "withdraw" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
                this.memory.task = "withdraw";
                this.withdrawEnergy();
        } else if (Chronicler.readBastionsFilled(this.room) === false) {
            this.memory.task = "fillTowers";
            this.fillTowers();
        } else if (Chronicler.readExtensionsFilled(this.room) === false) {
            this.memory.task = "fillExtensions";
            this.energizeCapacitors();
        } else { //move to idle spot
            this.memory.task = "idle";
            this.returnToIdleSpot();

            //only check once every global reset or after spawning
            if (this.evolved === false) {
                this.evolve();
                this.evolved = true;
            }
        }
        return true;
    }

    /**
     * Method to withdraw from storage, or if its empty, the terminal
     * 
     * @returns if the task was executed
     */
    withdrawEnergy(): boolean {
        //return to idle spot first for pathing optimizations
        if (!this.returnToIdleSpot()) {
            if (this.withdrawStorage() === false) {
                return this.withdrawTerminal();
            }
        }
        return false;
    }

    /**
     * Method to fill up groups of extensions collected as capacitors with energy
     */
    energizeCapacitors(): boolean {
        //find a capacitor that needs filling. capacitor list is already sorted
        if (this.currentCapacitor === undefined || this.currentCapacitor.full) {
            this.currentCapacitor = undefined;
            if (this.store.getFreeCapacity() > 0) this.memory.task = 'withdraw';
            for (let capacitor of this.supervisor.castrum[CASTRUM_TYPES.CAPACITOR]) {
                if (!capacitor.full) this.currentCapacitor = capacitor;
            }
        }
        if (this.currentCapacitor === undefined) {
            //try filling nexus
            if (this.fillExtensions(true)) {
                return true;
            } else {
                return false;
            }
        }
        let path = this.capacitorPaths[this.currentCapacitor.id];
        if (path === undefined) {
            path = PathFinder.search(
                this.idleSpot,
                {
                    "pos" : this.currentCapacitor.center,
                    "range" : 0
                },
                {
                    "roomCallback": Informant.getCostMatrix,
                    "plainCost": 2,
                    "swampCost": 10
                }
            ).path;
            path.unshift(this.idleSpot);
            this.capacitorPaths[this.currentCapacitor.id] = path;
        }
        if (this.moveByPath(path)) return true;
        for (let ext of this.currentCapacitor.extensions) {
            let liveExt = Game.getObjectById(ext);
            if (liveExt === null || liveExt.store.getFreeCapacity(RESOURCE_ENERGY) === 0) continue;
            this.liveObj.transfer(liveExt, RESOURCE_ENERGY);
            return true;
        }
        return false;
    }

    /**
     * Method to get the creep to renew itself to help prevent softlocks
     */
    renew() {
        let renewSpawn = Game.getObjectById(this.renewSpawnId || "" as Id<any>) || undefined;

        if (renewSpawn === undefined) {
            //get all nexuses
            let nexuses = this.supervisor.castrum["nexus"] as any;
            let chosenNexus = nexuses[0];
            this.renewSpawnId = chosenNexus.liveObj.id;
            renewSpawn = chosenNexus.liveObj;
        }
        //reserve the spawn, then renew until its full or no energy left
        this.supervisor.reserveNexus();

        if (Game.rooms[this.room].energyAvailable < Informant.calculateBodyCost(this.memory.body) && this.memory.task == "renewFill") {
            if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
                this.withdrawStorage();
            } else {
                this.fillExtensions();
            }
            return;
        }

        //if we get to this point, energyAvailable is > 300, so we can set task to just renew fully
        this.memory.task = "renew";
        if (renewSpawn !== undefined && !renewSpawn.spawning) {
            if (this.pos.inRangeTo(renewSpawn, 1)) {
                renewSpawn.renewCreep(this.liveObj);
            } else {
                this.liveObj.travelTo(renewSpawn);
            }
        }

        //once ticks to live is high enough we can break out of the loop
        if (this.ticksToLive > 1300 || Game.rooms[this.room].energyAvailable < 30) {
            this.memory.task = "none";
            this.renewSpawnId = undefined;
        }
    }

    /**
     * Method to make the creep stronger to meet higher demands
     * @returns {boolean} if the creep is evolving
     */
    evolve(): boolean {
        let liveController = Game.rooms[this.room].controller;
        if (liveController === undefined) return false
        //cap controller level at 7
        let controllerLevel = Math.min(liveController.level, 7);
        let roomEnergy = EXTENSION_ENERGY_CAPACITY[controllerLevel] * CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controllerLevel];
        let numCarry = Math.min(Math.ceil(roomEnergy / 100 / 2), 32);
        //always make it even for most efficient move parts
        if (numCarry % 2 != 0) numCarry--;

        //count carry parts in current body
        let carryCount = 0;
        for (let part of this.body) {
            if (part == CARRY) {
                carryCount++;
            }
        }

        //if the carry count is lower than the calculation and there are no construction sites, upgrade body
        if (carryCount != numCarry && Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES).length == 0) {
            let newBody: BodyPartConstant[] = [];
            for (let i = 0; i < numCarry; i++) {
                newBody.unshift(CARRY)
                newBody.push(MOVE);
            }

            this.memory.body = newBody;
            this.memory.task = "withdraw";
            //the runner will never die without it suiciding, so it has to be done
            this.liveObj.suicide();
            return true;
        }
        return false;
    }

    /**
     * Method to move the creep to its idle spot
     * @returns true if creep is moving
     */
    returnToIdleSpot(): boolean {
        if (this.pos.x != this.idleSpot.x || this.pos.y != this.idleSpot.y) {
            let roomPosIdle = new RoomPosition(this.idleSpot.x, this.idleSpot.y, this.room);
            this.liveObj.travelTo(roomPosIdle);
            return true;
        }
        return false;
    }

    getIdleSpot() {
        let schema = Chronicler.readSchema(this.room).main;
        let rotations = schema.rotations;
        let offsets = [1, 0];
        switch(rotations) {
            case 1:
                offsets = [1, 0];
                break;
            case 2:
                offsets = [2, 1];
                break;
            case 3:
                offsets = [1, 2];
                break;
            case 4:
                offsets = [0, 1];
                break;
        }
        return new RoomPosition(
            schema.anchor.x + offsets[0],
            schema.anchor.y + offsets[1],
            this.room
        );
    }
}
