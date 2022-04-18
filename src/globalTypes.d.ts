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
                    script: string;
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
    assignedRoom: string;
    travelTime?: number;
    boost?: Array<MineralBoostConstant>;
    offRoading?: boolean;
    task?: string;
}

interface RoomMemory {
    active: boolean;
    flags: RoomFlags;
    schematic: RoomSchematic;
    resources: RoomResources;
    statistics: RoomStatistics;
    remotes: RoomRemotes;
}

interface RoomFlags {
    gameStage: string;
    roadsBuilt: boolean;
    numContractors: number;
    bastionsFilled: boolean;
    doneScouting: boolean;
    workshopsFilled: boolean;
    boostingWorkshops: BoostingMemory;
}

type plainStatistics = 'energyDeposited' | 'energyUpgraded';
interface RoomStatistics {
    lastReset: number;
    remotes: {[roomName: string]: RemoteStatistics};
    energySpawning: {[key in CIVITAS_TYPES | LEGION_TYPES]: number};
    energyDeposited: number;
    energyUpgraded: number;
}

interface RemoteStatistics {
    energySpent: number;
    energyDeposited: number;
    garrisons: number;
    workers: number;
}

interface RoomRemotes {[roomName: string]: RemoteMemory;}

type ResourceId = Id<Source> | Id<Deposit>;

interface RoomResources {
    [resource: ResourceId]: ResourceMemory
}

interface ResourceMemory {
    type: 'source' | DepositConstant
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
    anchor: Position;
    rotations: number
}

interface RenewalTemplate {
    body: BodyPartConstant[];
    type: CivitasType | LegionType;
    memory: CreepMemory | any;
}

interface RemoteMemory {
    status: REMOTE_STATUSES;
    distances: number[];
    garrisoned?: boolean;
    roadsBuilt?: boolean;
    curated?: boolean;
}

interface BoostingMemory {
    [lab: Id<StructureLab>]: MineralBoostConstant;
}