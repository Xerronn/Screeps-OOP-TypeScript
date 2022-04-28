import Chronicler from 'controllers/Chronicler';
import Castrum from './Castrum';

export default class Workshop extends Castrum {
    liveObj: StructureLab;

    store: StoreDefinition;
    cooldown: number;

    workshopType: WORKSHOP_TYPES;
    resource: MineralConstant | MineralCompoundConstant;
    resourceCount: number;

    constructor(workshop: StructureLab) {
        super(workshop);

        this.store = this.liveObj.store;
        this.cooldown = this.liveObj.cooldown;

        this.workshopType = this.classify()
        this.resource = this.liveObj.mineralType || RESOURCE_HYDROGEN;
        this.resourceCount = this.store.getUsedCapacity(this.resource);
    }

    update(): boolean {
        if (!super.update()) return false;          //structure is dead

        this.store = this.liveObj.store;
        this.cooldown = this.liveObj.cooldown;

        this.resource = this.liveObj.mineralType || RESOURCE_HYDROGEN;
        this.resourceCount = this.store.getUsedCapacity(this.resource);

        return true;
    }

    run() {
        switch(this.workshopType) {
            case WORKSHOP_TYPES.REAGENT:
                //do nothing?
                
                break;
            case WORKSHOP_TYPES.PRODUCT:
                if (this.boosting) return;

                if (this.store.getFreeCapacity(RESOURCE_ENERGY) > this.store.getCapacity(RESOURCE_ENERGY) / 4) {
                    Chronicler.writeWorkshopsFilled(this.room, false);
                }
                if (this.getReagentsReady() && this.cooldown == 0) {
                    if (this.supervisor.reagentWorkshops.length === 2) {
                        this.liveObj.runReaction(this.supervisor.reagentWorkshops[0].liveObj, this.supervisor.reagentWorkshops[1].liveObj);
                    }
                }
                break;
        }
    }



    /**
     * Method that returns if the reagents are ready to react
     */
    getReagentsReady() {
        if (this.supervisor.reagentWorkshops.length !== 2) {
            throw new Error(`Supervisor is not correctly obtaining reagent workshops: ${JSON.stringify(this.supervisor.reagentWorkshops)}`);
        }
        for (let workshop of this.supervisor.reagentWorkshops) {
            if (workshop.cooldown !== 0 || workshop.resourceCount === 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Method to determine if the workshop is a reagent or product workshop
     */
    classify() {
        let anchor = Chronicler.readSchema(this.room).labs.anchor;
        let offsets = [[1, 1], [1, 2], [2, 1], [2, 2]];

        for (let spot of offsets) {
            if (this.pos.x === anchor.x + spot[0] && this.pos.y === anchor.y + spot[1]) {
                this.supervisor.reagentWorkshops.push(this);
                return WORKSHOP_TYPES.REAGENT;
            }
        }
        this.supervisor.productWorkshops.push(this);
        return WORKSHOP_TYPES.PRODUCT;
    }

    get boosting(): boolean {
        let boostingWorkshops = Chronicler.readBoostingWorkshops(this.room);
        for (let id in boostingWorkshops) {
            if (this.id === id) {
                return true
            }
        }
        return false;
    }
}
