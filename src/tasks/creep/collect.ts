import { ReturnCode } from 'tasks/enums';
import { moveByPath, march } from 'tasks/creep/move';

//functions related to a creep collecting a resource from an object or a ground tile

/**
 * Function to move a creep to a structure and withdraw an amount of a resource from it
 * @param Creep Creep to act on
 * @param Structure Structure to withdraw from
 * @param amount Number of resource to withdraw
 * @param buffer Minimum number of resource allowed left in the structure
 * @param resource Type of resource to withdraw
 * @param CachedPath Cached path to use instead of pathfinding
 * @returns ReturnCode
 */
export function collect(ACreep:Creep, Structure:StoreStructure, amount=10000, buffer=0, resource:ResourceConstant=RESOURCE_ENERGY, PathCache?: PathCache): ReturnCode {
    try {
        if (ACreep.pos.roomName !== Structure.pos.roomName) {
            march(ACreep, Structure.pos.roomName);
        }
        let storedAmount = Structure.store.getUsedCapacity(resource);
        if (storedAmount === null) return ReturnCode.ERR_INCOMPATIBLE_STRUCTURE;
        let withdrawAmount = Math.min(amount, ACreep.store.getFreeCapacity());
        if (ACreep.pos.inRangeTo(Structure, 1)) {
            if (storedAmount - buffer < withdrawAmount) return ReturnCode.IN_PROGRESS;
            ACreep.withdraw(Structure, resource, withdrawAmount);
            return ReturnCode.SUCCESS;
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