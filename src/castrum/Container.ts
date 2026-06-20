import Castrum from './Castrum';

export default class Container extends Castrum {
    id: Id<StructureContainer>;
    liveObj: StructureContainer;
    hasVision: boolean;

    constructor(container: StructureContainer) {
        super(container);

    }

    update(): boolean {
        if (!super.update()) {
            if (!Game.rooms[this.room]) {
                //no vision
                this.hasVision = false;
                return true;
            }
            //structure got killed
            return false;
        }
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
