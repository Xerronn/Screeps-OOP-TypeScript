import Chronicler from 'controllers/Chronicler';
import Worker from './worker';

interface ScoutMemory extends CreepMemory {
    targetRooms: string[];
}

export default class Scout extends Worker {
    memory: ScoutMemory;
    assignedRoom: string;

    constructor(scout: Creep) {
        super(scout);
        

        if (this.memory.targetRooms === undefined) {
            let options = Object.values(Game.map.describeExits(this.room));
            let currentRemotes = Chronicler.readRemotes(this.memory.spawnRoom);
            let visited: string[];
            if (currentRemotes === undefined) {
                visited = [];
            } else {
                visited = Object.keys(currentRemotes);
            }

            let targets = [];
            for (let t of options) {
                if (!visited.includes(t)) {
                    targets.push(t);
                }
            }
            this.memory.targetRooms = targets;
        }
        this.assignedRoom = this.memory.targetRooms[0];
    }

    update(): boolean {
        if (!super.update()) {
            //creep was killed
            if (this.ticksToLive > 2 && this.room === this.assignedRoom) {
                //log that room is dangerous
                let data: RemoteMemory = {
                    status: REMOTE_STATUSES.DANGEROUS,
                    distances: []
                }
                Chronicler.writeRemote(this.memory.spawnRoom, this.assignedRoom, data);
            }
            return false;
        }
        //attributes that will change tick to tick
        if (this.memory.targetRooms.length === 0) {
            Chronicler.writeDoneScouting(this.memory.spawnRoom, true);
            delete this.memory.generation;
            this.liveObj.suicide(); //rip
        }
        return true;
    }

    run(): boolean {
        //move to current targetRoom
        if (this.room !== this.assignedRoom) {
            return this.march(this.assignedRoom);
        } else if (this.room === this.memory.spawnRoom) {
            this.assignedRoom = this.memory.targetRooms[0];
            return this.march(this.assignedRoom);
        } else {
            //once we are there, we can do some logging
            let sources = Game.rooms[this.assignedRoom].find(FIND_SOURCES);
            if (sources.length == 2 && Game.rooms[this.assignedRoom].controller?.owner === undefined) {
                let data: RemoteMemory = {
                    status: REMOTE_STATUSES.SAFE,
                    distances: []
                };
                for (let source of sources) {
                    //todo: use pathfinder to see if a route is possible and get length
                    data.distances.push(this.pos.findPathTo(source).length);
                }
                Chronicler.writeRemote(this.memory.spawnRoom, this.assignedRoom, data);
            } else if (!Game.rooms[this.assignedRoom].controller) {
                //log that the room is a highway
                let data = {
                    status: REMOTE_STATUSES.UNINTERESTING,
                    distances: []
                };
                Chronicler.writeRemote(this.memory.spawnRoom, this.assignedRoom, data);
            } else if (Game.rooms[this.assignedRoom].controller?.owner !== undefined) {
                //log that the room is occupied
                let data = {
                    status: REMOTE_STATUSES.CLAIMED,
                    distances: []
                };
                Chronicler.writeRemote(this.memory.spawnRoom, this.assignedRoom, data);
            }

            //then move to next room
            this.memory.targetRooms.shift();
            this.assignedRoom = this.memory.spawnRoom;
            return this.march(this.assignedRoom);
        }
    }
}
