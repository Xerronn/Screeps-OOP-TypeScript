import Castrum from './Castrum';

const INTERESTED_RESOURCES = [
    // RESOURCE_ENERGY,
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN,
    RESOURCE_UTRIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_KEANIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_CATALYST
]

export default class Market extends Castrum {
    liveObj: StructureTerminal;

    store: StoreDefinition;
    cooldown: number;
    nativeMineral: MineralConstant;

    constructor(market: StructureTerminal) {
        super(market);

        this.store = market.store;
        this.cooldown = market.cooldown;
        this.nativeMineral = Game.rooms[this.room].find(FIND_MINERALS)[0].mineralType;
    }

    update(): boolean {
        if (!super.update()) return false;          //structure is dead

        this.cooldown = this.liveObj.cooldown;
        this.store = this.liveObj.store;

        return true;
    }

    run() {
        if (this.cooldown > 0 || Game.time % 5 !== 0) return;
        let netOrders = global.Imperator.logistician.getNetOrders(this.room);
        for (let resource of INTERESTED_RESOURCES) {
            let netOrder = netOrders[resource] || 0;
            let currentAmount = this.store.getUsedCapacity(resource) + netOrder;
            let targetAmount = this.getTarget(resource);

            if (currentAmount + 1000 < targetAmount && resource !== this.nativeMineral) {
                global.Imperator.logistician.requistion(this, resource, targetAmount - currentAmount);
                return;
            } else if (currentAmount - 5000 > targetAmount) {
                global.Imperator.logistician.sell(this.room, resource, currentAmount - targetAmount);
                return;
            }
        }
    }

    /**
     * Method that returns the number of each mineral we should aim to have stored
     * @param {String} resource
     * @returns Target number of resource in the terminal
     */
    getTarget(resource: ResourceConstant) {
        switch (resource) {
            case RESOURCE_ENERGY:
                return 50000;
            case this.nativeMineral:
                return 30000;
            default:
                return 10000;
        }
    }
}
