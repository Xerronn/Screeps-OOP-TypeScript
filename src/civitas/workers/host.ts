import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Nexus from 'castrum/Nexus';
import Worker from './Worker';

export default class Host extends Worker {
    idleSpot: {x: number, y: number};
    renewSpawnId?: Id<StructureSpawn>;

    constructor(host: Creep) {
        super(host)
        let anchor = Chronicler.readSchema(this.room).main.anchor;
        this.idleSpot = {
            'x': anchor.x + 1,
            'y': anchor.y + 1
        }
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
                this.withdrawStorage();
        } else if (Chronicler.readBastionsFilled(this.room) === false) {
            this.memory.task = "fillTowers";
            this.fillTowers();
        } else if (Chronicler.readExtensionsFilled(this.room) === false) {
            this.memory.task = "fillExtensions";
            this.fillExtensions();
        } else { //move to idle spot
            this.memory.task = "idle";
            if (this.pos.x != this.idleSpot.x || this.pos.y != this.idleSpot.y) {
                let roomPosIdle = new RoomPosition(this.idleSpot.x, this.idleSpot.y, this.room);
                this.liveObj.travelTo(roomPosIdle);
            }
        }
        return true;
    }

    /**
     * Method to get the creep to renew itself to help prevent softlocks
     */
    renew(usePrime=false) {
        let renewSpawn = Game.getObjectById(this.renewSpawnId || "" as Id<any>) || undefined;

        if (renewSpawn === undefined) {
            //get all nexuses
            let nexuses = this.supervisor.castrum["nexus"] as any;
            let chosenNexus = nexuses[0];
            if (nexuses.length > 1) {
                for (let nexus of nexuses) {
                    if (nexus.prime) {
                        //select the prime nexus if the renewer wants to use the prime
                        if (usePrime) {
                            chosenNexus = nexus;
                        } else continue;
                    } else {
                        //if not wanting to use prime, select the first one that isn't prime
                        if (!usePrime) {
                            chosenNexus = nexus;
                        } else continue;
                    }
                }
            }
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

        if (this.evolve() && this.memory.task == "renewFill") {
            return; //if evolving, just stop here
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
}
