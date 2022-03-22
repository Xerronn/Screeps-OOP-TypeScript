/**
 * INTERFACES
 */
 interface Memory {
    creeps: {[creepName: string]: CreepMemory};
    gFlags: {[flagName: string]: string | boolean};
    rooms: {[roomName: string]: RoomMemory};
    directives: {
        [roomName: string]: {
            [tick: number]: {
                [taskId: string]: {
                    script: string,
                    objArr: any
                }
            }
        }
    };
}

interface CreepMemory {
    name: string;
    type: CivitasType | LegionType;
    spawnRoom: string;
    generation: number | undefined;
    body: BodyPartConstant[];
    _trav: {};
    spawnDirection?: DirectionConstant;
    remote?: boolean;
    boost?: Array<MineralBoostConstant>;
    offRoading?: boolean;
    task?: string;
    targetRoom?: string;
}

interface RoomMemory {
    active: boolean;
    flags: RoomFlags;
    schematic: RoomSchematic;
    resources: RoomResources;
    statistics: any;   //todo
    remotes: RoomRemotes;
}

interface RoomFlags {
    gameStage: string,
    roadsBuilt: boolean,
    numContractors: number,
    bastionsFilled: boolean,
    curatorSpawned: boolean,
    doneScouting: boolean,
    garrisonSpawned: boolean,
    workshopsFilled: boolean,
    boostingWorkshops: BoostingMemory,
}

interface RoomRemotes {[roomName: string]: RemoteMemory;}

type ResourceId = Id<Source> | Id<Deposit>;

interface RoomResources {
    [resource: ResourceId]: ResourceMemory
}

interface ResourceMemory {
    type: 'source' | DepositConstant
    workers: {
        [creepType: string]: string[]
    }
    openSpots: number;
    linkId?: Id<StructureLink>;
}

interface Position {
    x: number;
    y: number;
}

interface RoomSchematic {
    paths: RoomPaths;
    main: StampPlacement;
    extensions: StampPlacement[];
    towers: StampPlacement;
    spawns: Position[];
    labs: StampPlacement;
}

interface RoomPaths {
    sources: {[id: Id<Source>]: Position[]};
    controller: Position[];
    exits: {[room: string]: Position[]};
    mineral: Position[];
}

interface Stamp extends Array<BuildableStructureConstant[]> {}
interface StampPlacement {
    anchor: Position,
    rotations: number
}

interface RenewalTemplate {
    body: BodyPartConstant[];
    type: CivitasType | LegionType;
    memory: CreepMemory | any;
}

interface RemoteMemory {
    status: REMOTE_STATUSES;
    distances?: number[];
    selected?: boolean;
}

interface BoostingMemory {
    [lab: Id<StructureLab>]: MineralBoostConstant;
}