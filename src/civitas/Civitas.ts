import Executive from 'administrators/Executive';
import Supervisor from 'administrators/Supervisor';
import Workshop from 'castrum/Workshop';
import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Traveler from 'thirdParty/traveler';
import GameObj from '../GameObj';

export default abstract class Civitas extends GameObj {
    //gameObj attributes
    id: Id<Creep>;
    liveObj: Creep;
    pos: RoomPosition;
    room: string;
    hits: number;
    hitsMax: number;

    //basic creep attributes
    name: string;
    type: CIVITAS_TYPES | LEGION_TYPES;
    memory: CreepMemory;
    store: StoreDefinition;
    body: BodyPartConstant[];
    spawning: boolean;
    ticksToLive: number;

    //custom attributes
    assignedRoom: string;
    spawnTime: number;
    spawnRoom: string;
    stuckTick: number;      //number of ticks a creep has been stuck in a position
    stuckPos: RoomPosition;

    constructor(civitas: Creep) {
        super();
        this.liveObj = civitas;

        this.id = civitas.id;
        this.name = civitas.name;
        this.type = civitas.memory.type;
        this.hitsMax = civitas.hitsMax;
        this.body = civitas.body.map(b => b.type);
        this.assignedRoom = civitas.memory.assignedRoom || civitas.memory.spawnRoom;
        this.spawnRoom = civitas.memory.spawnRoom;

        //attributes that change every tick
        this.memory = civitas.memory;
        this.store = civitas.store;
        this.pos = civitas.pos;
        this.room = civitas.room.name;
        this.hits = civitas.hits;
        this.spawning = civitas.spawning;
        this.ticksToLive = civitas.ticksToLive || 1500;

        //Parse spawn time from name
        let regex = this.name.match('(?<=\<)(.*?)(?=\>)') || [''];
        this.spawnTime = parseInt(regex[0]);
        this.stuckTick = 0;
        this.stuckPos = this.pos;
    }

    update(): boolean {
        this.liveObj = Game.creeps[this.name];
        if (this.liveObj === undefined) {
            //only rebirth if the generation flag is there. If you want a creep to rebirth, set generation = 0 in the memory
            if (this.memory.generation !== undefined) {
                let template = {
                    "body": [...this.body],
                    "type": this.memory.type,
                    "memory": {...this.memory}
                };
                this.supervisor.initiate(template);
                delete this.memory.generation;
            }
            this.supervisor.dismiss(this);
            
            return false; //creep is dead
        }

        this.memory = this.liveObj.memory;
        this.store = this.liveObj.store;
        this.pos = this.liveObj.pos;
        this.room = this.liveObj.room.name;
        this.hits = this.liveObj.hits;
        this.ticksToLive = this.liveObj.ticksToLive || 1500;
        return true;
    }

    /**
     * Things to run before anything else. If returns true, then continue to run. Otherwise terminate here
     */
    preTick(): boolean {
        if (this.memory.boost !== undefined && this.ticksToLive > 1400) {
            if (this.boost()) return false;
            delete this.memory.boost;
        }
        if (this.room === this.spawnRoom && this.hits < this.hitsMax) {
            for (let bastion of this.supervisor.castrum[CASTRUM_TYPES.BASTION]) {
                bastion.heal(this.liveObj);
            }
        }
        return true;
    }

    /**
     * Empty run method because this class is not meant to be instantiated
     * @returns {false}
     */
    run() {
        return;
    }

    /**
     * Method to march to a specific room
     * @param room 
     * @returns 
     */
    march(room: string, deep=false): boolean {
        if (this.pos.x === 50 || this.pos.x === 0 || this.pos.y === 0 || this.pos.y === 50) {
            this.liveObj.travelTo(new RoomPosition(25, 25, this.room));
            return true;
        }
        
        if (this.room !== room || (deep && !this.pos.inRangeTo(25, 25, 15))) {
            this.liveObj.travelTo(new RoomPosition(25, 25, room), {'preferHighway': true});
            return true;
        }
        return false;
    }

    /**
     * Method to boost the creep with a already prepared lab
     * @param {string[]} boostType
     */
    boost(): boolean {
        for (let boost of this.memory.boost || []) {
            let workshopData = Chronicler.readBoostingWorkshops(this.spawnRoom)[boost] || undefined;
            if (workshopData === undefined) continue;
            let workshop = Informant.getWrapper(workshopData.workshop) as Workshop;
            if (!workshop) {
                continue;
            }

            if (this.pos.inRangeTo(workshop.liveObj, 1)) {
                workshop.liveObj.boostCreep(this.liveObj);
                workshop.boosting = false;
                let old = Chronicler.readBoostingWorkshops(this.room);
                old[boost] = undefined;
                Chronicler.writeBoostingWorkshops(this.room, old);
                continue;
            } else {
                this.liveObj.travelTo(workshop.liveObj);
            }
            return true;
        }
        return false;
    }

    /**
     * Custom moveByPath implementation with creep swapping
     * @param path 
     * @returns boolean on whether it is still moving
     */
     moveByPath(path: RoomPosition[]): boolean {
        //if creep is sitting at its destination, there is nothing to do
        if (this.pos.isEqualTo(path[path.length - 1])) {
            this.stuckTick = 0;
            return false;
        }

        if (this.stuckTick > 3) {
            //do something
            this.liveObj.travelTo(path[path.length - 1]);
            // console.log(this.name + ' ' + 'pathing');
            return true;
        }

        //detect if creep is stuck, and path normally if necessary
        if (this.stuckPos.x != this.pos.x || this.stuckPos.y != this.pos.y) {
            this.stuckPos = this.pos;
            this.stuckTick = 0;
        } else {
            this.stuckPos = this.pos;
            this.stuckTick++;
        }

        for (let i in path) {
            if (path[i].isEqualTo(this.pos)) {
                let nextPos = path[parseInt(i) + 1];
                let nextDirection = this.pos.getDirectionTo(nextPos);
                if (this.stuckTick > 0) {
                    let blockingCreeps = Game.rooms[this.room].lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y);
                    if (blockingCreeps.length > 0 && blockingCreeps[0].my) {
                        blockingCreeps[0].move(Traveler.reverseDirection(nextDirection));
                    }
                }
                this.liveObj.move(nextDirection);
                return true;
            }
        }

        return false;
    }

    /**
     * Method that returns the number of active body parts on a creep
     * @param bodyPart Type of Body part to count
     * @returns number of body part
     */
    getActiveBodyParts(bodyPart: BodyPartConstant): number {
        return this.liveObj.getActiveBodyparts(bodyPart)
    }

    get arrived(): boolean {
        return this.room === this.assignedRoom && this.pos.x !== 50 && this.pos.x !== 0 && this.pos.y !== 0 && this.pos.y !== 50
    }

    get fleeing(): boolean {
        return this.remote && Chronicler.readRemote(this.spawnRoom, this.assignedRoom)?.status === REMOTE_STATUSES.INVADED;
    }

    get remote(): boolean {
        return this.assignedRoom !== this.spawnRoom;
    }

    get supervisor(): Supervisor {
        return global.Imperator.administrators[this.spawnRoom].supervisor;
    }

    get executive(): Executive {
        return global.Imperator.administrators[this.spawnRoom].executive;
    }
}
