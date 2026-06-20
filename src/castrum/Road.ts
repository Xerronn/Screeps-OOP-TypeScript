import Castrum from './Castrum';

export default class Road extends Castrum {
    id: Id<StructureRoad>;
    liveObj: StructureRoad;
    hasVision: boolean;

    constructor(road: StructureRoad) {
        super(road);

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
