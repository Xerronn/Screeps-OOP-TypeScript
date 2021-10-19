import {Archivist} from 'administrators/archivist';
import {Worker} from './worker';

interface ScoutMemory extends CreepMemory {
    targetRooms: string[];
}

export class Scout extends Worker {
    memory: ScoutMemory;
    targetRoom: string;

    constructor(scout: Creep) {
        super(scout);

        if (this.memory.targetRooms === undefined) {
            let options = Object.values(Game.map.describeExits(this.room));
            let currentRemotes = Archivist.getRemotes(this.memory.spawnRoom);
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

        this.targetRoom = this.memory.targetRooms[0];
    }

    update(): boolean {
        if (!super.update()) {
            //creep was killed
            if (this.ticksToLive > 2 && this.room === this.targetRoom) {
                //log that room is dangerous
                let data: RemoteRoomMemory = {
                    status: REMOTE_STATUSES.DANGEROUS
                }
                Archivist.logRemote(this.memory.spawnRoom, this.targetRoom, data);
            }
            return false;
        }
        //attributes that will change tick to tick
        return true;
    }

    run(): boolean {
        //move to current targetRoom
        return true;
        // if (!this.arrived) {
        //     this.march();
        // } else if (this.room == this.memory.spawnRoom) {
        //     //ensures that it travels back through the home room, just to be safe
        //     if (this.memory.targets.length > 0) {
        //         this.targetRoom = this.memory.targets[0];
        //         this.arrived = false;
        //         this.march();
        //     } else {
        //         //signal that we are ready to start building up to the remotes
        //         global.Archivist.setDoneScouting(this.room, true);
        //         //scouting is done, no need to have rebirth
        //         delete this.memory.generation;
        //     }
        // } else {
        //     //once we are there, we can do some logging
        //     let sources = Game.rooms[this.targetRoom].find(FIND_SOURCES);
        //     if (sources.length == 2 && Game.rooms[this.targetRoom].controller && !Game.rooms[this.targetRoom].controller.owner) {
        //         let data = {
        //             status : "safe",
        //             distances : []
        //         };
        //         for (let source of sources) {
        //             //todo: use pathfinder to see if a route is possible and get length
        //             data.distances.push(this.pos.findPathTo(source).length);
        //         }
        //         global.Archivist.logRemote(this.memory.spawnRoom, this.targetRoom, data);
        //     } else if (!Game.rooms[this.targetRoom].controller) {
        //         //log that the room is a highway
        //         let data = {
        //             status : "highway"
        //         };
        //         global.Archivist.logRemote(this.memory.spawnRoom, this.targetRoom, data);
        //     } else if (Game.rooms[this.targetRoom].controller.owner) {
        //         //log that the room is occupied
        //         let data = {
        //             status : "claimed"
        //         };
        //         global.Archivist.logRemote(this.memory.spawnRoom, this.targetRoom, data);
        //     }

        //     //then move to next room
        //     this.memory.targets.shift();
        //     this.arrived = false;
        //     this.targetRoom = this.memory.spawnRoom;
        //     this.march();
        // }
    }
}
