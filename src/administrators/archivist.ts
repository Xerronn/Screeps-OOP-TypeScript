import { Architect } from "./architect";

export class Archivist {

    static anchor: object;

    /**
     * Method that builds the memory object at the beginning and after global resets
     * @param {boolean} reset reset the memory
     */
    static build(reset = false): void {
        if (!Memory.creeps || reset) {
            Memory.creeps = {};
        }

        if (!Memory.rooms || reset) {
            Memory.rooms = {};
        }

        if (!Memory.gFlags || reset) {
            Memory.gFlags = {};
            Memory.gFlags.memoryInit = false;
        }

        if (!Memory.directives || reset) {
            Memory.directives = {};
        }

        for (var room of global.Imperator.dominion) {
            if (!Memory.rooms[room]) {
                Memory.rooms[room] = {
                    sources: {},
                    flags: {
                        gameStage: '0',                             //must be a string to store floats in memory
                        anchor: Architect.calculateAnchor(room)
                    },
                    statistics: {},
                };

                let terrainData = Game.rooms[room].getTerrain();
                let sources = Game.rooms[room].find(FIND_SOURCES).map(source => source.id);
                for (let source of sources) {
                    let liveSource = Game.getObjectById(source);
                    if (liveSource === null) continue;
                    let openSpots = 0;
                    for (let i = 0; i < 3; i++) {   //x values
                        for (let j = 0; j < 3; j++) {   //y values
                            if (terrainData.get(liveSource.pos.x-1 + i, liveSource.pos.y-1 + j) == 0) {
                                openSpots++;
                            }
                        }
                    }
                    Memory.rooms[room].sources[source] = {
                        workers: {},
                        openSpots: openSpots
                    };
                }
            }
        }
    }

    /**
     * Method that logs some information about a scouted remote to memory
     * @param {String} ownerRoom string representing the room that owns the remote
     * @param {String} remoteRoom string representing the remote
     * @param {Object} data data to store in the memory
     */
    static logRemote(ownerRoom: string, remoteRoom: string, data: RemoteRoomMemory): void {
        let liveRoom = Memory.rooms[ownerRoom];
        if (liveRoom === undefined) return;
        if (liveRoom.remotes === undefined) {
            liveRoom.remotes = {};
        }
        liveRoom.remotes[remoteRoom] = data;
    }

     /**
     * Get the anchor point of a room
     * @param {String} room string representation of a room
     * @returns the anchor coordinate object
     */
    static getAnchor(room: string): RoomAnchor {
        return Memory.rooms[room].flags.anchor;
    }

    /**
     * Gets the labs that are boosting and what chemicals they have
     * @returns
     */
    static getBoostingWorkshops(room: string): object {
        return Memory.rooms[room].flags.boostingWorkshops || {};
    }

    /**
     * Get the curator spawned flag for a given room
     * @param {String} room string representation of a room
     * @returns the curator spawned flag
     */
    static getCuratorSpawned(room: string): boolean {
        return Memory.rooms[room].flags.curatorSpawned;
    }

    /**
     * Get the done scouting flag for a given room
     * @param {String} room string representation of a room
     * @returns the done Scouting flag
     */
    static getDoneScouting(room: string): boolean {
        return Memory.rooms[room].flags.doneScouting;
    }

    /**
     * Get gameStage flag for a given room
     * @param {String} room string representing the room
     * @returns value of the gameStage flag
     */
    static getGameStage(room: string): string {
        return Memory.rooms[room].flags.gameStage;
    }

    /**
     * Get the garrison spawned flag for a given room
     * @param {String} room string representation of a room
     * @returns the garrison spawned flag
     */
    static getGarrisonSpawned(room: string): boolean {
        return Memory.rooms[room].flags.garrisonSpawned;
    }

    /**
     * Get labs filled flag for a given room
     * @param {String} room string representing the room
     * @returns value of the labsFilled flag
     */
    static getLabsFilled(room: string): boolean {
        return Memory.rooms[room].flags.labsFilled;
    }

    /**
     * Get num contractors flag for a given room
     * @param {String} room string representing the room
     * @returns value of the numContractors flag
     */
    static getNumContractors(room: string): number {
        return Memory.rooms[room].flags.numContractors;
    }

    /**
     * Get all data on remotes for a room
     * @param {String} room string representing the room
     * @returns remotes object
     */
    static getRemotes(room: string): RemoteMemory | undefined {
        return Memory.rooms[room].remotes;
    }

    /**
     * Get remotes built flag for a given room
     * @param {String} room string representing the room
     * @returns value of Remotes built flag
     */
    static getRemoteBuilt(room: string): boolean {
        return Memory.rooms[room].flags.remoteBuilt;
    }

    /**
     * Get roads built flag for a given room
     * @param {String} room string representing the room
     * @returns value of roadsBuilt flag
     */
    static getRoadsBuilt(room: string): boolean {
        return Memory.rooms[room].flags.roadsBuilt;
    }

    /**
     * Get all sources in a room
     * @param {String} room string representing the room
     * @returns  room sources object
     */
    static getSources(room: string): SourceMemory {
        return Memory.rooms[room].sources;
    }

    /**
     * Get a room statistic
     * @param {String} room string representing the room
     * @param {String} stat the statistic to return
     * @returns  room sources object
     */
    static getStatistic(room: string, stat: string): any {
        try {
            return Memory.rooms[room].statistics[stat];
        } catch (err) {
            return 0;
        }
    }

    /**
     * Get towers filled flag for a given room
     * @param {String} room string representing the room
     * @returns value of the towersFilled flag
     */
    static getTowersFilled(room: string): boolean {
        return Memory.rooms[room].flags.towersFilled;
    }

    /////////////////
    /////SETTERS/////
    /////////////////

    /**
     * Set the anchor point of a room
     * @param {String} room string representation of a room
     * @param {Object} value object with x and y coordinates
     */
    static setAnchor(room: string, value: RoomAnchor): void {
        Memory.rooms[room].flags.anchor = value;
    }

    /**
     * Sets the labs that are boosting and what chemicals they have
     * @returns
     */
    static setBoostingWorkshops(room: string, value: Object): void {
        Memory.rooms[room].flags.boostingWorkshops = value;
    }

    /**
     * Set the curator spawned flag for a given room
     * @param {String} room string representation of a room
     * @param {Boolean} value true or false value to set the flag
     *
     */
    static setCuratorSpawned(room: string, value: boolean): void {
        Memory.rooms[room].flags.curatorSpawned = value;
    }

    /**
     * Set the done scouting of a room
     * @param {String} room string representation of a room
     * @param {Boolean} value true or false value to set the flag
     */
    static setDoneScouting(room: string, value: boolean): void {
        Memory.rooms[room].flags.doneScouting = value;
    }

    /**
     * Set the room planning gameStage for a given room
     * @param {String} room string representing the room
     * @param {String} value value to set the flag
     */
    static setGameStage(room: string, value: string): void {
        Memory.rooms[room].flags.gameStage = value;
    }

    /**
     * Set the garrison spawned flag for a given room
     * @param {String} room string representation of a room
     * @param {Boolean} value true or false value to set the flag
     *
     */
    static setGarrisonSpawned(room: string, value: boolean): void {
        Memory.rooms[room].flags.garrisonSpawned = value;
    }

    /**
     * Set labs filled flag for a given room
     * @param {String} room string representing the room
     * @param {Boolean} value true or false value to set the flag
     */
    static setLabsFilled(room: string, value: boolean): void {
        Memory.rooms[room].flags.labsFilled = value;
    }

    /**
     * Set num contractors flag for a given room
     * @param {String} room string representing the room
     * @param {Integer} value integer to set the flag to
     */
    static setNumContractors(room: string, value: number): void {
        Memory.rooms[room].flags.numContractors = value;
    }

    /**
     * Set remote built flag for a given room
     * @param {String} room string representing the room
     * @param {Boolean} value boolean to set the flag to
     */
    static setRemoteBuilt(room: string, value: boolean): void {
        Memory.rooms[room].flags.remoteBuilt = value;
    }

    /**
     * Set roads built flag for a given room
     * @param {String} room string representing the room
     * @param {Boolean} value boolean to set the flag to
     */
    static setRoadsBuilt(room: string, value: boolean): void {
        Memory.rooms[room].flags.roadsBuilt = value;
    }

    /**
     * Set a room statistic
     * @param {String} room string representing the room
     * @param {String} stat the statistic to return
     */
    static setStatistic(room: string, stat: string, value: any): void {
        Memory.rooms[room].statistics[stat] = value;
    }

    /**
     * Set towers filled flag for a given room
     * @param {String} room string representing the room
     * @param {Boolean} value true or false value to set the flag
     */
    static setTowersFilled(room: string, value: boolean): void {
        Memory.rooms[room].flags.towersFilled = value;
    }
}
