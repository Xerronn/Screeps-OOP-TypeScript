import Castrum from './Castrum';

import type Supervisor from 'administrators/Supervisor';

export default class Container extends Castrum {
    id: Id<StructureContainer>;
    liveObj: StructureContainer;

    constructor(supervisor: Supervisor, container: StructureContainer) {
        super(supervisor, container);

    }

    update(): boolean {
        if (!super.update()) {
            //structure got killed
            return false;
        }
        if (!this.hasVision) return true;
        this.liveObj = Game.getObjectById(this.id) as StructureContainer;
        return true;
    }
    
    run() {
        if (!this.hasVision) return;
        if (this.hits / this.hitsMax < 0.8) {
            this.supervisor.requestRepair(this);
        }
    }
}
