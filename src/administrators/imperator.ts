import {Supervisor} from './supervisor';
import {Executive} from './executive';
import { Archivist } from './archivist';
import { Architect } from './architect';

//highest level class overseeing all operations in the game
export class Imperator {
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
        //make an supervisor for every room that we own
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
        Archivist.build();
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
        if (this.dominion.length == 1 && Object.keys(Game.structures).length == 1 && Object.keys(Game.creeps).length == 0) {
            //fresh respawn detection
            Archivist.build(true);
            return true;
        }
        return false;
    }
}
