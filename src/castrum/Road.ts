import Castrum from './Castrum';

export default class Road extends Castrum {
    id: Id<StructureRoad>;
    liveObj: StructureRoad;

    constructor(road: StructureRoad) {
        super(road);

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
