import Castrum from './Castrum';

export default class Container extends Castrum {
    id: Id<StructureContainer>;
    liveObj: StructureContainer;

    constructor(container: StructureContainer) {
        super(container);

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
