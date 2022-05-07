import Workshop from 'castrum/Workshop';
import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Worker, {WorkerMemory} from './worker'

interface ChemistMemory extends WorkerMemory {
    targetChemical: MineralConstant | MineralCompoundConstant;
    targetChemicalAmount: number;
    task: 'supplyReagents' | 'withdraw' | 'idle';
}

export default class Chemist extends Worker {
    memory: ChemistMemory;
    idleSpot: Position;
    targetChemical: MineralConstant | MineralCompoundConstant;
    targetChemicalAmount: number;
    goalChemical: RESOURCE_CATALYZED_GHODIUM_ACID | RESOURCE_GHODIUM_HYDRIDE;

    constructor(chemist: Creep) {
        super(chemist);

        //only supports tier 1 and 3 upgrade boost for now
        this.goalChemical = RESOURCE_GHODIUM_HYDRIDE;
        if (Chronicler.readGameStage(this.spawnRoom) >= 8) {
            this.goalChemical = RESOURCE_CATALYZED_GHODIUM_ACID
        }

        this.targetChemical = this.getTargetChemical();
        this.targetChemicalAmount = this.memory.targetChemicalAmount;

        //sets idle spot depending on schema
        let workshopSchema = Chronicler.readSchema(this.spawnRoom).labs;
        if (workshopSchema.rotations % 2 === 0) {
            //even
            this.idleSpot = {
                x: workshopSchema.anchor.x + 3,
                y: workshopSchema.anchor.y
            }
        } else {
            //odd
            this.idleSpot = {
                x: workshopSchema.anchor.x,
                y: workshopSchema.anchor.y
            }
        }
    }

    run() {
        //prevent chemist from losing any minerals to death
        if (this.ticksToLive < 30) {
            if (this.depositStore()) return;
            this.liveObj.suicide();
            return;
        }

        //stop any reactions from running while they are being filled
        if (this.memory.task === "supplyReagents") this.supervisor.reserveWorkshops();

        //handle boosting of creeps
        if (this.prepareBoosts()) return;

        //reagent labs are empty of minerals and creep is doing nothing
        if (this.getReagentsEmpty() && this.memory.task === "idle") {
            this.memory.task = "withdraw";
        }
        if (this.memory.task === "withdraw") {
            if (this.withdrawProducts()) return;
            this.targetChemical = this.getTargetChemical(true);
            this.targetChemicalAmount = this.memory.targetChemicalAmount;
            //labs are empty, move to next mineral in the chain
            this.memory.task = "supplyReagents"
        }
        if (this.memory.task === "supplyReagents") {
            if (this.fillReagents()) return;

            //done supplying labs
            this.memory.task = "idle";
            //end the reservation
            this.supervisor.reserveWorkshops(0);
        }

        if (Chronicler.readWorkshopsFilled(this.spawnRoom) === false) {
            this.fillWorkshops();
        } else {
            //empty stores
            if (this.depositStore()) return;
            this.liveObj.travelTo(new RoomPosition(this.idleSpot.x, this.idleSpot.y, this.spawnRoom));
        }
    }

    prepareBoosts(): boolean {
        let boostingWorkshops = Chronicler.readBoostingWorkshops(this.spawnRoom);
        let boost: MineralBoostConstant;
        for (boost in boostingWorkshops) {
            let boostingWorkshop = boostingWorkshops[boost];
            let workshop = Informant.getWrapper(boostingWorkshop?.workshop || "" as Id<StructureLab>) as Workshop;

            //if we don't have enough boost to do the body, then just skip it
            if (workshop === undefined || boostingWorkshop === undefined || 
                this.getChemicalAmount(boost) + this.store.getUsedCapacity(boost) + workshop.store.getUsedCapacity(boost) < boostingWorkshop?.amount) {

                boostingWorkshops[boost] = undefined;
                continue;
            }

            if (this.depositStore(boost)) return true;

            //empty the workshop of its minerals if it does not contain the boost
            let product = workshop.resource;
            if (product !== boost && workshop.store.getUsedCapacity(product) > 0) {
                if (this.withdrawWorkshop(workshop.liveObj, product)) return true;
            }
            if (workshop.resourceCount < boostingWorkshop.amount) {
                //withdraw the boost we need
                let tripAmount = Math.min(
                    this.store.getFreeCapacity(boost), 
                    boostingWorkshop.amount - workshop.store.getUsedCapacity(boost)
                );
                if (this.store.getUsedCapacity(boost) < tripAmount) {
                    if (this.withdrawStore(boost, tripAmount)) return true;
                }

                //deposit it in the lab
                if (this.pos.inRangeTo(workshop.liveObj, 1)) {
                    this.liveObj.transfer(workshop.liveObj, boost, tripAmount);
                } else {
                    this.liveObj.travelTo(workshop.liveObj);
                }
                return true;
            }
        }

        Chronicler.writeBoostingWorkshops(this.spawnRoom, boostingWorkshops);
        return false;
    }

    fillReagents() {
        //loop through the two reagentWorkshops
        let reagentWorkshops = this.supervisor.reagentWorkshops;
        if (reagentWorkshops.length !== 2) throw Error ('Supervisor is not correctly obtaining reagentWorkshops');
        let targetReagents = Informant.getChemicalRecipes(this.targetChemical as any); //ew TODO: add support onto informant for all chemicals
        for (let i = 0; i < 2; i++) {
            if (reagentWorkshops[i].store.getUsedCapacity(targetReagents[i]) < this.targetChemicalAmount) {

                if (this.depositStore(targetReagents[i])) return true;
                let tripAmount = Math.min(
                    this.store.getFreeCapacity(targetReagents[i]), 
                    this.targetChemicalAmount - reagentWorkshops[i].store.getUsedCapacity(targetReagents[i])
                );
                //fill up creep to match what is needed for the lab
                if (this.store.getUsedCapacity(targetReagents[i]) < tripAmount) {
                    if (this.getChemicalAmount(targetReagents[i]) < tripAmount) {
                        return true;
                    }
                    if (this.withdrawStore(targetReagents[i], tripAmount)) return true;
                }
                //move to lab and deposit the amount
                if (this.pos.inRangeTo(reagentWorkshops[i].liveObj, 1)) {
                    this.liveObj.transfer(reagentWorkshops[i].liveObj, targetReagents[i], tripAmount);
                } else {
                    this.liveObj.travelTo(reagentWorkshops[i].liveObj);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Method that takes the product from all the reactant labs
     * @returns 
     */
    withdrawProducts(): boolean {
        let productWorkshops = this.supervisor.productWorkshops;
        for (let workshop of productWorkshops) {
            if (workshop.resourceCount > 0 && workshop.boosting === false) {
                let product = workshop.resource;
                if (this.store.getFreeCapacity(product) > 0) {
                    if (this.withdrawWorkshop(workshop.liveObj, product)) return true;
                } else break;
            }
        }
        //deposit anything the creep has once it reaches this point
        if (this.depositStore()) return true;
        return false;
    }

    /**
     * Method to withdraw a resource from a workshop
     * @param {Position} target 
     * @param {Resource} res 
     * @returns 
     */
    withdrawWorkshop(target: StructureLab, resource: ResourceConstant) : boolean {
        if (target.store.getUsedCapacity(resource) || 0 > 0) {
            if (this.pos.inRangeTo(target, 1)) {
                this.liveObj.withdraw(target, resource);
            } else {
                this.liveObj.travelTo(target);
            }
            return true;
        }
        return false;
    }

    /**
     * Method to fill workshops with energy
     * @returns 
     */
    fillWorkshops(): boolean {
        let productWorkshops = this.supervisor.productWorkshops;
        for (let workshop of productWorkshops) {
            if (workshop.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                //fill up creep with required energy
                let tripAmount = Math.min(this.store.getFreeCapacity(RESOURCE_ENERGY), workshop.store.getFreeCapacity(RESOURCE_ENERGY));
                if (this.store.getUsedCapacity(RESOURCE_ENERGY) < tripAmount) {
                    this.withdrawStore(RESOURCE_ENERGY, tripAmount);
                    return true;
                }
                if (this.pos.inRangeTo(workshop.liveObj, 1)) {
                    this.liveObj.transfer(workshop.liveObj, RESOURCE_ENERGY);
                } else {
                    this.liveObj.travelTo(workshop.liveObj);
                }
                return true;
            }
        }
        Chronicler.writeWorkshopsFilled(this.spawnRoom, true);
        return false;
    }

     /**
     * Method to withdraw a resource from the proper location
     * @param {RESOURCE_TYPE} res Resource constant
     * @param {Integer} targetAmount the amount to withdraw, default to the creep's carry capacity
     * @returns If an action was taken
     */
    withdrawStore(resource: ResourceConstant, targetAmount=10000): boolean {
        let target: StructureStorage | StructureTerminal | undefined;
        let logistician = global.Imperator.logistician;
        if (resource !== RESOURCE_ENERGY && logistician.basicResources.includes(resource)) {
            target = Game.rooms[this.spawnRoom].terminal;
        } else {
            target = Game.rooms[this.spawnRoom].storage;
        }
        if (target !== undefined && target.store.getUsedCapacity(resource) >= targetAmount) {
            if (this.pos.inRangeTo(target, 1)) {
                let amount = Math.min(this.store.getFreeCapacity(resource), targetAmount);
                this.liveObj.withdraw(target, resource, amount);
            } else {
                this.liveObj.travelTo(target);
            }
            return true;
        }
        return false;
    }

    /**
     * Method that deposits all held resources into their proper places
     * @returns If an action was taken
     */
    depositStore(ignoredResource: ResourceConstant | undefined = undefined): boolean {
        for (let res in this.store) {
            if (ignoredResource !==  undefined && res === ignoredResource) continue;
            let target;
            if (global.Imperator.logistician.basicResources.includes(res as ResourceConstant)) {
                target = Game.rooms[this.spawnRoom].terminal;
            } else {
                target = Game.rooms[this.spawnRoom].storage;
            }

            if (target === undefined) throw new Error(`Room is missing either a room or terminal`)

            if (this.pos.inRangeTo(target, 1)) {
                this.liveObj.transfer(target, res as ResourceConstant);
            } else {
                this.liveObj.travelTo(target);
            }
            return true;
        }
        return false;
    }

    /**
     * Method that returns if the reagents workshops are empty of minerals
     */
    getReagentsEmpty(): boolean {
        for (let workshop of this.supervisor.reagentWorkshops) {
            if (workshop.resourceCount > 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Method that returns the amount of a chemical is in storage
     */
    getChemicalAmount(chemical: MineralConstant | MineralCompoundConstant): number {
        let target;
        if (global.Imperator.logistician.basicResources.includes(chemical as ResourceConstant)) {
            target = Game.rooms[this.room].terminal;
        } else {
            target = Game.rooms[this.room].storage;
        }

        return target?.store.getUsedCapacity(chemical) || 0;
    }

    getTargetChemical(force: boolean = false): MineralConstant | MineralCompoundConstant {
        if (this.memory.targetChemical === undefined || force) {
            let storage = Game.rooms[this.spawnRoom].storage;
            if (storage === undefined) throw Error('Storage is undefined')
            let steps = Informant.getChemicalSteps(this.goalChemical);
            
            let chosenStep: MineralConstant | MineralCompoundConstant | undefined;
            for (let step of steps.reverse()) {
                if (chosenStep === undefined || storage.store.getUsedCapacity(step) < 3000) {
                    chosenStep = step;
                    continue;
                }
                if (storage.store.getUsedCapacity(step) >= 3000) break;
            }
            this.memory.targetChemical = chosenStep as MineralConstant | MineralCompoundConstant;
            let targetAmount = 3000 - storage.store.getUsedCapacity(chosenStep);
            if (targetAmount <= 0) targetAmount = 3000;
            this.memory.targetChemicalAmount = targetAmount;
        }
        return this.memory.targetChemical;
    }
}