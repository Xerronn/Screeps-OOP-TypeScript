export default class Chronicler {
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
    }

    /**
     * Read if a room is active
     * @param room 
     * @returns 
     */
    static readRoomActive(room: string): boolean {
        if (!Chronicler.readRoomRegistered(room)) throw new Error("Room is not registered");
        return Memory.rooms[room] && Memory.rooms[room].active || false;
    }

    /**
     * Set if a room is active
     * @param room 
     * @param roomActive 
     */
    static writeRoomActive(room: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not registered");
        Memory.rooms[room].active = value;
    }

    /**
     * Read if a specific room is registered in memory
     * @param room 
     * @returns 
     */
    static readRoomRegistered(room: string): boolean {
        return Memory.rooms[room] !== undefined;
    }

    /**
     * Registers a room with some starting data
     * @param room
     * @param schema 
     * @param resources 
     * @param force 
     * @returns 
     */
    static registerRoom(room: string, schema: RoomSchematic, resources: RoomResources, force=false): boolean {
        if (!Memory.rooms[room] || force) {
            Memory.rooms[room] = {
                'active': true,
                'flags': {
                    'gameStage': '0',
                    'roadsBuilt': false,
                    'bastionsFilled': false,
                    'numContractors': 0,
                    'curatorSpawned': false,
                    'doneScouting': false,
                    'workshopsFilled': false,
                    'boostingWorkshops': {}
                },
                'schematic': schema,
                'resources': resources,
                'statistics': {},
                'remotes': {}
            }
        }
        return true;
    }

    /**
     * Reads the stamp locations for a room
     * @param room 
     * @returns roomSchematic
     */
    static readSchema(room: string): RoomSchematic {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].schematic;
    }

    /**
     * Get all data on remotes for a room
     * @param {String} room string representing the room
     * @returns remotes object
     */
     static readRemotes(room: string): RoomRemotes {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].remotes;
    }

    /**
     * Get all data on a single remote for a room
     * @param room 
     * @param remote 
     * @returns 
     */
    static readRemote(room: string, remote: string): RemoteMemory | undefined {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].remotes[remote];
    }

    /**
     * Method that logs some information about a scouted remote to memory
     * @param {String} room string representing the room that owns the remote
     * @param {String} remoteRoom string representing the remote
     * @param {Object} data data to store in the memory
     */
    static writeRemote(room: string, remote: string, data: RemoteMemory) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        let roomMemory = Memory.rooms[room];
        if (roomMemory.remotes === undefined) {
            roomMemory.remotes = {};
        }
        roomMemory.remotes[remote] = data;
    }
    
    /**
     * Method that changes the status of a remote room
     * @param room 
     * @param remote 
     * @param status 
     */
    static writeRemoteStatus(room: string, remote: string, status: REMOTE_STATUSES) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        if (Chronicler.readRemote(room, remote) === undefined) throw new Error('Remote room does not exist');
        Memory.rooms[room].remotes[remote].status = status;
    }

    /**
     * Method that changes the roads built flags of a remote room
     * @param room 
     * @param remote 
     * @param roadsBuilt 
     */
    static writeRemoteRoadsBuilt(room: string, remote: string, roadsBuilt: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        if (Chronicler.readRemote(room, remote) === undefined) throw new Error('Remote room does not exist');
        Memory.rooms[room].remotes[remote].roadsBuilt = roadsBuilt;
    }

    /**
     * Get the garrison spawned flag for a given room
     * @param {String} room string representation of a room
     * @returns the garrison spawned flag
     */
     static readRemoteGarrisoned(room: string, remote: string): boolean {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].remotes[remote].garrisoned || false;
    }

    /**
     * Set the garrison spawned flag for a given room
     * @param room 
     * @param value 
     */
    static writeRemoteGarrisoned(room: string, remote: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].remotes[remote].garrisoned = value;
    }
    
    /**
     * Gets the labs that are boosting and what chemicals they have
     * @returns
     */
    static readBoostingWorkshops(room: string): BoostingMemory {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.boostingWorkshops;
    }

    /**
     * Sets the labs that are boosting and what chemicals they have
     * @param room 
     * @param value 
     */
     static writeBoostingWorkshops(room: string, value: BoostingMemory) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.boostingWorkshops = value;
    }

    /**
     * Get the curator spawned flag for a given room
     * @param {String} room string representation of a room
     * @returns the curator spawned flag
     */
    static readCuratorSpawned(room: string): boolean {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.curatorSpawned;
    }

    /**
     * Set the curator spawned flag for a given room
     * @param room 
     * @param value 
     */
    static writeCuratorSpawned(room: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.curatorSpawned = value;
    }

    /**
     * Get the done scouting flag for a given room
     * @param {String} room string representation of a room
     * @returns the done Scouting flag
     */
    static readDoneScouting(room: string): boolean {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.doneScouting;
    }

    /**
     * Set the done scouting flag for a given room
     * @param room 
     * @param value 
     */
    static writeDoneScouting(room: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.doneScouting = value;
    }

    static readExtensionsFilled(room: string): boolean {
        return Game.rooms[room].energyCapacityAvailable === Game.rooms[room].energyAvailable;
    }

    /**
     * Get gameStage flag for a given room
     * @param {String} room string representing the room
     * @returns value of the gameStage flag
     */
    static readGameStage(room: string): number {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return parseFloat(Memory.rooms[room].flags.gameStage);
    }

    /**
     * Set the gameStage flag for a given room
     * @param room 
     * @param value 
     */
    static writeGameStage(room: string, value: number) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.gameStage = String(value);
    }

    /**
     * Get the resources of a room
     * @param room 
     * @returns 
     */
    static readResources(room: string): RoomResources {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].resources;
    }

    /**
     * Get the roads built flag for a given room
     * @param room 
     * @returns 
     */
    static readRoadsBuilt(room: string): boolean {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.roadsBuilt;
    }

    static writeRoadsBuilt(room: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.roadsBuilt = value;
    }

    /**
     * Get the workshops filled flag for a given room
     * @param {String} room string representing the room
     * @returns value of the labsFilled flag
     */
    static readWorkshopsFilled(room: string): boolean {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.workshopsFilled;
    }

    /**
     * Set the workshops filled flag for a given room
     * @param room 
     * @param value 
     */
    static writeWorkshopsFilled(room: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.workshopsFilled = value;
    }

    /**
     * Get num contractors flag for a given room
     * @param {String} room string representing the room
     * @returns value of the numContractors flag
     */
    static readNumContractors(room: string): number {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.numContractors;
    }

    /**
     * Set the num contractors flag for a given room
     * @param room 
     * @param value 
     */
    static writeNumContractors(room: string, value: number) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.numContractors = value;
    }    

    // /**
    //  * Get remotes built flag for a given room
    //  * @param {String} room string representing the room
    //  * @returns value of Remotes built flag
    //  */
    // static getRemoteBuilt(room: string): boolean {
    //     return Memory.rooms[room].flags.remoteBuilt;
    // }

    /**
     * Get a room statistic
     * @param {String} room string representing the room
     * @param {String} stat the statistic to return
     * @returns  room sources object
     */
    static readStatistic(room: string, stat: string): any {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        try {
            return Memory.rooms[room].statistics[stat];
        } catch (err) {
            throw new Error("Statistic doesn't exist");
        }
    }

    /**
     * Set a room statistic to a value
     * @param room 
     * @param stat 
     * @param value 
     */
    static writeStatistic(room: string, stat: string, value: any) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].statistics[stat] = value;
    }

    /**
     * Get bastion filled flag for a given room
     * @param {String} room string representing the room
     * @returns value of the towersFilled flag
     */
    static readBastionsFilled(room: string): boolean {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        return Memory.rooms[room].flags.bastionsFilled;
    }

    /**
     * Set bastion filled flag for a given room
     * @param room 
     * @param value 
     */
    static writeBastionsFilled(room: string, value: boolean) {
        if (!Chronicler.readRoomActive(room)) throw new Error("Room is not active or not registered");
        Memory.rooms[room].flags.bastionsFilled = value;
    }
}