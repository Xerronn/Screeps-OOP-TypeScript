import { ReturnCode } from "tasks/enums";
import Traveler from "thirdParty/traveler";

//functions related to moving a creep towards a goal or series of goals

/**
 * Function to move a creep along a precalculated path
 * @param Creep The Creep to move
 * @param PathCache Information about the Creep's movement
 * @returns 
 */
export function moveByPath(ACreep:Creep, PathCache: PathCache): ReturnCode {
    try {
        let Path = PathCache.path;
        //if creep is sitting at its destination, there is nothing to do
        if (ACreep.pos.isEqualTo(Path[Path.length - 1])) {
            PathCache.stuckTick = 0;
            return ReturnCode.SUCCESS;
        }

        if (PathCache.stuckTick > 3) {
            //do something
            ACreep.travelTo(Path[Path.length - 1]);
            // console.log(ACreep.name + ' ' + 'Pathing');
            return ReturnCode.IN_PROGRESS;
        }

        //detect if creep is stuck, and Path normally if necessary
        if (PathCache.stuckPos.x != ACreep.pos.x || PathCache.stuckPos.y != ACreep.pos.y) {
            PathCache.stuckPos = ACreep.pos;
            PathCache.stuckTick = 0;
        } else {
            PathCache.stuckPos = ACreep.pos;
            PathCache.stuckTick++;
        }

        for (let i in Path) {
            if (Path[i].isEqualTo(ACreep.pos)) {
                let nextPos = Path[parseInt(i) + 1];
                let nextDirection = ACreep.pos.getDirectionTo(nextPos);
                if (PathCache.stuckTick > 0) {
                    let blockingCreeps = Game.rooms[ACreep.pos.roomName].lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y);
                    if (blockingCreeps.length > 0 && blockingCreeps[0].my) {
                        blockingCreeps[0].move(Traveler.reverseDirection(nextDirection));
                    }
                }
                ACreep.move(nextDirection);
                return ReturnCode.IN_PROGRESS;
            }
        }
        return ReturnCode.ERR;
    } catch {
        return ReturnCode.ERR;
    }
}

/**
 * Function to move a creep to a target room
 * @param ACreep The ACreep to move
 * @param roomName The room to move to
 * @param deep If the ACreep should move deeper into the room before returning success
 * @returns 
 */
export function march(ACreep:Creep, roomName: string, deep=false): ReturnCode {
    try {
        if (ACreep.pos.x === 50 || ACreep.pos.x === 0 || ACreep.pos.y === 0 || ACreep.pos.y === 50) {
            ACreep.travelTo(new RoomPosition(25, 25, ACreep.pos.roomName));
            return ReturnCode.IN_PROGRESS;
        }
        if (ACreep.pos.roomName !== roomName || (deep && !ACreep.pos.inRangeTo(25, 25, 15))) {
            ACreep.travelTo(new RoomPosition(25, 25, roomName), {'preferHighway': true});
            return ReturnCode.IN_PROGRESS;
        }
        return ReturnCode.SUCCESS;
    } catch {
        return ReturnCode.ERR;
    }
}