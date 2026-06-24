import Castrum from './Castrum';

import type Supervisor from 'administrators/Supervisor';

export default class Rampart extends Castrum {
    id: Id<StructureRampart>;
    liveObj: StructureRampart;

    constructor(supervisor: Supervisor, Rampart: StructureRoad) {
        super(supervisor, Rampart);

    }

    update(): boolean {
        if (!super.update()) {
            //structure got killed
            return false;
        }
        if (!this.hasVision) return true;
        this.liveObj = Game.getObjectById(this.id) as StructureRampart;
        return true;
    }

    run() {
        if (!this.hasVision) return;
        if (this.hits < 1000) {
            this.supervisor.requestRepair(this);
        }
    }
}
