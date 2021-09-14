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

    initialize() {
        //make an supervisor for every room that we own
        for (let room of this.dominion) {
            this.administrators[room] = {
                supervisor: new Supervisor(room),
                executive: new Executive(room)
            }
        }
    }

    refreshDominion() {
        this.dominion = _.filter(Game.rooms, room => room.controller && room.controller.my).map(room => room.name);
    }
}