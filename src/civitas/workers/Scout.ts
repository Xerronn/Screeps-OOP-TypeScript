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
            let currentRemotes = Chronicler.readRemotes(this.spawnRoom);
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
                Chronicler.writeRemote(this.spawnRoom, this.assignedRoom, data);
            }
            return false;
        }
        //attributes that will change tick to tick
        if (this.memory.targetRooms.length === 0) {
            Chronicler.writeDoneScouting(this.spawnRoom, true);
            delete this.memory.generation;
            this.liveObj.suicide(); //rip
        }
        return true;
    }

    run() {
        //move to current targetRoom
        if (!this.arrived) {
            return this.march(this.assignedRoom);
        } else if (this.room === this.spawnRoom) {
            this.assignedRoom = this.memory.targetRooms[0];
            return this.march(this.assignedRoom);
        } else {
            //once we are there, we can do some logging
            let sources = Game.rooms[this.assignedRoom].find(FIND_SOURCES);
            if (Game.rooms[this.assignedRoom].controller?.owner === undefined && 
                (Game.rooms[this.assignedRoom].controller?.reservation === undefined || 
                Game.rooms[this.assignedRoom].controller?.reservation?.username === 'Invader')) {
                let data: RemoteMemory = {
                    status: REMOTE_STATUSES.SAFE,
                    distances: []
                };
                for (let source of sources) {
                    //todo: use pathfinder to see if a route is possible and get length
                    data.distances.push(this.pos.findPathTo(source).length);
                }
                Chronicler.writeRemote(this.spawnRoom, this.assignedRoom, data);
            } else if (!Game.rooms[this.assignedRoom].controller) {
                //log that the room is a highway
                let data = {
                    status: REMOTE_STATUSES.UNINTERESTING,
                    distances: []
                };
                Chronicler.writeRemote(this.spawnRoom, this.assignedRoom, data);
            } else if (Game.rooms[this.assignedRoom].controller?.owner !== undefined || Game.rooms[this.assignedRoom].controller?.reservation !== undefined) {
                //log that the room is occupied
                let data = {
                    status: REMOTE_STATUSES.DANGEROUS,
                    distances: []
                };
                Chronicler.writeRemote(this.spawnRoom, this.assignedRoom, data);
            }

            //then move to next room
            this.memory.targetRooms.shift();
            this.assignedRoom = this.spawnRoom;
            return this.march(this.assignedRoom);
        }
    }
}
