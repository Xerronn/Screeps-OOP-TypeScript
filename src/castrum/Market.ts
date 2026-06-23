import Castrum from './Castrum';

import type Supervisor from 'administrators/Supervisor';

export default class Market extends Castrum {
    liveObj: StructureTerminal;

    store: StoreDefinition;
    cooldown: number;
    nativeMineral: MineralConstant;

    constructor(supervisor: Supervisor, market: StructureTerminal) {
        super(supervisor, market);

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
        let logistician = global.Imperator.logistician;
        let netOrders = logistician.getNetOrders(this.room);
        for (let resource of logistician.basicResources) {
            let netOrder = netOrders[resource] || 0;
            let currentAmount = this.store.getUsedCapacity(resource) + netOrder;
            let targetAmount = this.getTarget(resource);

            if (currentAmount + 1000 < targetAmount && resource !== this.nativeMineral) {
                logistician.requistion(this, resource, targetAmount - currentAmount);
                return;
            } else if (currentAmount - 5000 > targetAmount) {
                let history = Game.market.getHistory(resource);
                if (!history || !Array.isArray(history) || history.length === 0) continue;
                let result = logistician.sell(this.room, resource, currentAmount - targetAmount);
                if (result === null) continue;
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
