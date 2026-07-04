import Castrum from './Castrum';
import { RCL_WALL_HITS } from 'controllers/Informant';

import type Supervisor from 'administrators/Supervisor';

export default class Rampart extends Castrum {
    id: Id<StructureRampart>;
    liveObj: StructureRampart;

    targetHits: number;

    constructor(supervisor: Supervisor, Rampart: StructureRoad) {
        super(supervisor, Rampart);

        let liveRoomRCL = Game.rooms[this.room].controller?.level || 0;
        this.targetHits = RCL_WALL_HITS[liveRoomRCL];
    }

    update(): boolean {
        if (!super.update()) {
            //structure got killed
            return false;
        }
        if (!this.hasVision) return true;
        if (Game.time % 500 === 0) {
            let liveRoomRCL = Game.rooms[this.room].controller?.level || 0;
            this.targetHits = RCL_WALL_HITS[liveRoomRCL];
        }
        this.liveObj = Game.getObjectById(this.id) as StructureRampart;
        return true;
    }

    run() {
        if (!this.hasVision) return;
        if (this.hits < this.targetHits) {
            this.supervisor.requestRepair(this);
        }
    }
}
