import { ReturnCode, CreepAction } from 'tasks/enums';
import { moveByPath, march } from 'tasks/creep/move';

//functions related to a creep depositing part/all of its inventory into another place

/**
 * Function to move a creep to a structure or creep and transfer/upgrade/build an amount of a resource into it
 * @param ACreep Creep to act on
 * @param Structure Structure to deposit from
 * @param Action Action the creep will take with the structure
 * @param amount Number of resource to deposit
 * @param resource Type of resource to deposit
 * @param CachedPath Cached path to use instead of pathfinding
 * @returns ReturnCode
 */
export function deposit(ACreep:Creep, Structure:StoreStructure | Creep | ConstructionSite, Action:CreepAction=CreepAction.TRANSFER, amount=10000, resource:ResourceConstant=RESOURCE_ENERGY, PathCache?: PathCache): ReturnCode {
    try {
        if (ACreep.pos.roomName !== Structure.pos.roomName) {
            march(ACreep, Structure.pos.roomName);
        }
        switch (Action) {
            case CreepAction.TRANSFER:
                if (Structure instanceof StructureController || Structure instanceof ConstructionSite) return ReturnCode.ERR_INCOMPATIBLE_STRUCTURE;
                let freeAmount = Structure.store.getUsedCapacity(resource);
                if (freeAmount === null) return ReturnCode.ERR_INCOMPATIBLE_STRUCTURE;
                let depositAmount = Math.min(amount, ACreep.store.getFreeCapacity());
                if (ACreep.pos.inRangeTo(Structure, 1) && freeAmount >= depositAmount) {
                    ACreep.transfer(Structure, resource, depositAmount);
                    return ReturnCode.SUCCESS;
                }
                break;
            case CreepAction.UPGRADE:
                if (!(Structure instanceof StructureController)) return ReturnCode.ERR_INCOMPATIBLE_STRUCTURE;
                if (ACreep.pos.inRangeTo(Structure, 3)) {
                    ACreep.upgradeController(Structure);
                    return ReturnCode.SUCCESS;
                }
                break;
            case CreepAction.BUILD:
                if (!(Structure instanceof ConstructionSite)) return ReturnCode.ERR_INCOMPATIBLE_STRUCTURE;
                if (ACreep.pos.inRangeTo(Structure, 3)) {
                    ACreep.build(Structure);
                    return ReturnCode.SUCCESS;
                }
                break;
        }
        if (PathCache == undefined) {
            ACreep.travelTo(Structure);
        } else {
            moveByPath(ACreep, PathCache)
        }
        return ReturnCode.IN_PROGRESS;
    } catch {
        return ReturnCode.ERR;
    }
}

export function fillExtensions(ACreep: Creep) {

}