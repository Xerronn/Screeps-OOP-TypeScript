import {Supervisor} from './supervisor';
import {Executive} from './executive';

//highest level class overseeing all operations in the game
export class Imperator {
    administrators: {[roomName: string]: {supervisor: Supervisor, executive: Executive}};
    dominion: string[];

    constructor() {
        this.dominion = _.filter(Game.rooms, room => room.controller && room.controller.my).map(room => room.name);
        this.administrators = {};
        this.initialize();
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
     * Method that refreshes the rooms that we own, usually run when a new room is taken
     */
    refreshDominion(): void {
        this.dominion = _.filter(Game.rooms, room => room.controller && room.controller.my).map(room => room.name);
    }
}
