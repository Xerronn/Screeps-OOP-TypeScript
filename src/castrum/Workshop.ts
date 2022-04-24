import Chronicler from 'controllers/Chronicler';
import Castrum from './Castrum';

export default class Workshop extends Castrum {
    liveObj: StructureLab;

    store: StoreDefinition;

    constructor(workshop: StructureLab) {
        super(workshop);
    }

    update(): boolean {
        if (!super.update()) return false;          //structure is dead

        this.store = this.liveObj.store;

        return true;
    }

    run() {
        if (this.store.getFreeCapacity(RESOURCE_ENERGY) > this.store.getCapacity(RESOURCE_ENERGY) / 4) {
            Chronicler.writeWorkshopsFilled(this.room, false);
        }
    }
}
