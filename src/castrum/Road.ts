import Chronicler from 'controllers/Chronicler';
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
        this.liveObj = Game.getObjectById(this.id) as StructureRoad;
        return true;
    }

    //maybe we hook into this to trigger repairs or something
    run() {
        if (this.hits / this.hitsMax < 0.8) {
            this.supervisor.requestRepair(this);
        }
    }
}
