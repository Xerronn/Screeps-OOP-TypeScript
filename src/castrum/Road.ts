import Castrum from './Castrum';

import type Supervisor from 'administrators/Supervisor';

export default class Road extends Castrum {
    id: Id<StructureRoad>;
    liveObj: StructureRoad;

    constructor(supervisor: Supervisor, road: StructureRoad) {
        super(supervisor, road);

    }

    update(): boolean {
        if (!super.update()) {
            //structure got killed
            return false;
        }
        if (!this.hasVision) return true;
        this.liveObj = Game.getObjectById(this.id) as StructureRoad;
        return true;
    }

    run() {
        if (!this.hasVision) return;
        if (this.hits / this.hitsMax < 0.8) {
            this.supervisor.requestRepair(this);
        }
    }
}
