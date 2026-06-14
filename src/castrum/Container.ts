import Chronicler from 'controllers/Chronicler';
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
        this.liveObj = Game.getObjectById(this.id) as StructureContainer;
        return true;
    }
    
    //maybe we hook into this to trigger repairs or something
    run() {
        if (this.hits / this.hitsMax < 0.8) {
            this.supervisor.requestRepair(this);
        }
    }
}
