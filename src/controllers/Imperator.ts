import Supervisor from '../administrators/Supervisor';
import Executive from '../administrators/Executive';
import Chronicler from './Chronicler';
import Architect from './Architect';

//highest level class overseeing all operations in the game
export default class Imperator {
    administrators: {[roomName: string]: {supervisor: Supervisor, executive: Executive}};
    dominion: string[];

    constructor() {
        this.dominion = _.filter(Game.rooms, room => room.controller && room.controller.my).map(room => room.name);
        this.administrators = {};
    }

    /**
     * Method that runs on every global reset that constructs room admins
     */
    initialize(): void {
        //make a supervisor and executive for every room that we own
        for (let room of this.dominion) {
            this.administrators[room] = {
                supervisor: new Supervisor(room),
                executive: new Executive(room)
            }
        }

        for (let room of this.dominion) {
            this.administrators[room].supervisor.wrap();
        }
    }

    /**
     * Method that runs all objects in the game
     */
    run() {
        for (let room of this.dominion) {
            this.administrators[room].supervisor.run();
            this.administrators[room].executive.run();
        }
    }

    /**
     * Method that refreshes the live game references for all wrapper Objects in the game
     */
    refresh() {
        for (let room of this.dominion) {
            this.administrators[room].supervisor.refresh();
        }
    }

    /**
     * Method that creates a supervisor and executive for a newly claimed room
     * @param {String} room String representing the room
     */
    initRoom(room: string, originRoom: string) {
        this.refreshDominion();
        Chronicler.build();
        this.administrators[room] = {
            supervisor: new Supervisor(room),
            executive: new Executive(room)
        }
        this.administrators[originRoom].executive.spawnDevelopers(room);
    }

    /**
     * Method that refreshes the rooms that we own, usually run when a new room is taken
     */
    refreshDominion(): void {
        this.dominion = _.filter(Game.rooms, room => room.controller && room.controller.my).map(room => room.name);
    }

    /**
     * Method that checks if this is a new playthrough
     * @returns If the Dominion has just respawned
     */
    checkRespawn(): boolean {
        if (this.dominion.length == 1 && Object.keys(Game.structures).length == 2 && Object.keys(Game.creeps).length == 0 && Game.rooms[this.dominion[0]].controller?.level == 1) {
            //fresh respawn detection
            Chronicler.build(true);
            return true;
        }
        return false;
    }
}
