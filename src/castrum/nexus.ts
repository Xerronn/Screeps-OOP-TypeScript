import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Castrum from './Castrum';

//spawn structure definition
export default class Nexus extends Castrum {
    liveObj: StructureSpawn;
    id: Id<StructureSpawn>;

    name: string;
    spawning: Spawning | null;
    spawningThisTick: boolean;      //if the nexus has already return OK to spawn something this tick
    reservedTick: number;           //if the nexus is currently reserved by a renewing creep

    constructor(nexus: StructureSpawn) {
        super(nexus);

        this.id = nexus.id;
        this.name = nexus.name;
        this.spawning = nexus.spawning;
        this.spawningThisTick = false;
    }

    update(): boolean {
        if (!super.update()) return false;          //structure is dead
        this.spawning = this.liveObj.spawning;

        this.spawningThisTick = false;

        return true;
    }

    run() {
        if (this.spawning && this.spawning.remainingTime === 2) {
            this.supervisor.wrapCreep(this.spawning.name);
        }
        return true;
    }

    /**
     * A function to spawn a creep in a room
     * @param {Array} body Array of body constants that the creep will be spawned with
     * @param {String} type The type of creep to be spawned
     * @param {Object} memory an optional memory object to spawn the creep with. Recommended only for rebirth. Do other memory stuff in objects
     * @returns
     */
    spawnCreep(body: BodyPartConstant[], type: CIVITAS_TYPES | LEGION_TYPES , memory: CreepMemory) {
        let name = type + "<" + Game.time + ">"

        let spawnBody = body;
        //reduce move parts when roads are built
        if (Chronicler.readRoadsBuilt(this.room) && !memory.offRoading) {
            //build a list of all non move body parts
            let noMoves: BodyPartConstant[] = [];
            for (let part of spawnBody) {
                if (part != MOVE) {
                    if (part == WORK) {
                        noMoves.unshift(part);
                    } else noMoves.push(part);
                }
            }

            //if noMoves is empty, body was entirely moves
            if (noMoves.length > 0) {
                //add moves onto that list until moves are equal to half the non moves
                let targetMoves = Math.ceil(noMoves.length / 2);
                for (let i = 0; i < targetMoves; i++) {
                    noMoves.push(MOVE);
                }
                spawnBody = noMoves;
            }
        }

        memory.name = name;
        memory.type = type;
        memory.spawnRoom = this.room;
        memory.body = spawnBody;

        let options: SpawnOptions = {
            'memory': memory,
            'energyStructures': this.supervisor.energyStructures
        };
        
        let success = this.liveObj.spawnCreep(spawnBody, name, options);

        if (success == OK) {
            this.spawningThisTick = true;

            //keeping some energy expenditure stats
            this.statTracking(memory)
        }
        return success;
    }

    /**
     * Method that sets some statistics
     * @param {String} type the type of the creep
     * @param {String} body the body of the creep
     */
    statTracking(memory: CreepMemory) {
        let bodyCost = Informant.calculateBodyCost(memory.body);
        //increment number spent on that creep type
        Chronicler.writeIncrementSpawningStatistic(this.room, memory.type, bodyCost);
        //if it is remote, increment the remote values
        if (memory.assignedRoom !== undefined && memory.assignedRoom !== this.room && Chronicler.readRemoteRegistered(this.room, memory.assignedRoom)) {
            Chronicler.writeIncrementRemoteStatistic(this.room, memory.assignedRoom, 'energySpent', bodyCost);
            if (memory.type === LEGION_TYPES.GARRISON) {
                Chronicler.writeIncrementRemoteStatistic(this.room, memory.assignedRoom, 'garrisons', 1);
            } else Chronicler.writeIncrementRemoteStatistic(this.room, memory.assignedRoom, 'workers', 1);
        }
    }
}
