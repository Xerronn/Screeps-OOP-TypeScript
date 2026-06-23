import Chronicler from 'controllers/Chronicler';
import Castrum from './Castrum';

import type Supervisor from 'administrators/Supervisor';

export default class Conduit extends Castrum {
    id: Id<StructureLink>;
    liveObj: StructureLink;

    linkType: LinkType;

    //greater than zero means yes, number represents ticks waiting
    shouldFill: number;
    store: Store<RESOURCE_ENERGY, false>

    constructor(supervisor: Supervisor, link: StructureLink) {
        super(supervisor, link);

        //if the controller link needs energy
        this.shouldFill = 0;

        //check if the link is within 2 squares of either a controller or storage
        let nearestBuilding = this.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType != STRUCTURE_LINK
                    && (structure.structureType == STRUCTURE_STORAGE || structure.structureType == STRUCTURE_CONTROLLER)
                    && this.pos.inRangeTo(structure, 2)
            }
        }) || undefined;

        //if it isn't it is a fill type link(does nothing but receive)
        if (nearestBuilding !== undefined) {
            let sType = nearestBuilding.structureType;

            //set supervisor link references for roles
            if (sType == LINK_TYPES.STORAGE) {
                this.linkType = LINK_TYPES.STORAGE
                this.supervisor.storageLink = this;
            } else {
                this.linkType = LINK_TYPES.CONTROLLER;
                this.supervisor.controllerLink = this;
            }
        } else {
            this.linkType = LINK_TYPES.CONTAINER;

            //assign this link to the source if it is near one
            let nearSource = this.pos.findInRange(FIND_SOURCES, 3)[0]
            if (nearSource) {
                //set the link attribute on the source
                let allSources = Chronicler.readResources(this.room);

                allSources[nearSource.id].linkId = this.id;
            }
        }
    }

    update(): boolean {
        if (!super.update()) {
            //structure got killed
            return false;
        }
        this.liveObj = Game.structures[this.id] as StructureLink;
        this.store = this.liveObj.store;
        return true;
    }

    /**
     * link logic run each tick
     */
    run(): boolean {
        let controllerLink = this.supervisor.controllerLink;
        let storageLink = this.supervisor.storageLink;
        try {
            switch (this.linkType) {
                case LINK_TYPES.STORAGE:
                    this.shouldFill = this.store.getUsedCapacity(RESOURCE_ENERGY) <= 400 ? this.shouldFill + 1 : 0;

                    //prefer for miner links to send directly but fall back to this if needed.
                    //the other half of this logic is in arbiter
                    if (controllerLink && controllerLink.shouldFill > 10 && controllerLink.liveObj) {
                        this.liveObj.transferEnergy(controllerLink.liveObj);
                        return true;
                    }

                    break;
                case LINK_TYPES.CONTAINER:
                    if (this.store.getUsedCapacity(RESOURCE_ENERGY) <= 400) {
                        return false;
                    }

                    if (controllerLink && controllerLink.shouldFill > 0 && controllerLink.liveObj) {
                        this.liveObj.transferEnergy(controllerLink.liveObj);
                        return true;
                    }

                    if (storageLink && storageLink.shouldFill > 0 && storageLink.liveObj) {
                        this.liveObj.transferEnergy(storageLink.liveObj);
                    }
                    
                    break;
                case LINK_TYPES.CONTROLLER:
                    this.shouldFill = this.store.getUsedCapacity(RESOURCE_ENERGY) <= 400 ? this.shouldFill + 1 : 0;

                    break;
            }
            return true;
        } catch (err) {
            //probably controllerLink or storageLink isn't defined
            //do nothing
        }
        return false;
    }
}
