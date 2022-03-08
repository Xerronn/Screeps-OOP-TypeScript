import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Castrum from './Castrum';

//spawn structure definition
export default class Nexus extends Castrum {
    liveObj: StructureSpawn;
    id: Id<StructureSpawn>;

    name: string;
    prime: boolean;                 //if the nexus is located next to manager position
    spawning: Spawning | null;
    wrapped: boolean;               //if the currently spawning creep has been wrapped yet
    spawningThisTick: boolean;      //if the nexus has already return OK to spawn something this tick
    reservedTick: number;           //if the nexus is currently reserved by a renewing creep

    constructor(nexus: StructureSpawn) {
        super(nexus);
        this.liveObj = nexus;

        this.id = nexus.id;
        this.name = nexus.name;
        this.spawning = nexus.spawning;
        if (!this.spawning) {
            this.wrapped = false
        } else this.wrapped = true;
        this.spawningThisTick = false;

        this.reservedTick = Game.time - 1;
        this.prime = false;
        let anchorPos = Chronicler.getAnchor(this.room);
        let primeSpawnLoc = Informant.getBunkerSchema().spawn.pos[0];
        if (this.pos.x - anchorPos.x == primeSpawnLoc.x &&
            this.pos.y - anchorPos.y == primeSpawnLoc.y) {
                this.prime = true;
            }
    }

    update(): boolean {
        if (!super.update()) return false;          //structure is dead
        this.liveObj = Game.spawns[this.name];
        this.spawning = this.liveObj.spawning;

        if (!this.spawning) {
            this.wrapped = false;
        }

        this.spawningThisTick = false;

        return true;
    }

    run() {
        if (this.spawning && !this.wrapped) {
            this.supervisor.wrapCreep(this.spawning.name);
            this.wrapped = true;
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
    spawnCreep(body: BodyPartConstant[], type: CivitasType | LegionType , memory: CreepMemory) {
        let name = type + "<" + Game.time + ">"

        let spawnBody = body;
        //reduce move parts when roads are built
        if (Chronicler.getRoadsBuilt(this.room) && !memory.offRoading) {
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

        let options: any = {
            'memory': memory
        };

        //the arbiter will always get spawned by the prime nexus and pushed to the right
        if (type == "arbiter") {
            options.directions = [RIGHT];
        }
        let success = this.liveObj.spawnCreep(spawnBody, name, options);

        if (success == OK) {
            this.spawningThisTick = true;

            //keeping some energy expenditure stats
            if (["hauler", "emissary", "prospector", "curator", "garrison"].includes(type)) {
                this.statTracking(body);
            }
        }
        return success;
    }

    /**
     * Method that sets some statistics
     * @param {String} type the type of the creep
     * @param {String} body the body of the creep
     */
    statTracking(body: BodyPartConstant[]) {
        let bodyCost = Informant.calculateBodyCost(body);

        let currentValue = Chronicler.getStatistic(this.room, "RemoteEnergySpent");
        Chronicler.setStatistic(this.room, "RemoteEnergySpent", currentValue + bodyCost);
    }
}
