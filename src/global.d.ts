/**
 * INTERFACES
 */
 interface Memory {
    creeps: {[creepName: string]: CreepMemory}
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
    flags: {
    }
    schematic: RoomSchematic;
    resources: RoomResources;
    statistics?: any;   //todo
    remotes?: {[roomName: string]: RemoteMemory;};
}

interface RoomResources {
    [resource: ResourceType]: SourceMemory
}

type ResourceType = Id<Source> | Id<Deposit>;

interface Position {
    x: number,
    y: number
}

interface RoomSchematic {
    paths: Position[][],
    main: StampPlacement,
    extensions: StampPlacement[],
    tower: StampPlacement,
    spawn: Position[],
    lab: StampPlacement
}

interface Stamp extends Array<BuildableStructureConstant[]> {}
interface StampPlacement {
    anchor: Position,
    rotations: number
}

interface SourceMemory {
    [sourceId: Id<Source>]: {
        workers: {
            [creepType: string]: string[]
        }
        openSpots: number;
        linkId?: Id<StructureLink>;
    }
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

//TYPES AND CONSTANTS

declare enum CASTRUM_TYPES {
    //wrappers
    BASTION = 'bastion',
    CONDUIT = 'conduit',
    MARKET = 'market',
    NEXUS = 'nexus',
    WORKSHOP = 'workshop',

    //primitives
    CONTAINER = 'container',
    EXTENSION = 'extension',
    ROAD = 'road',

    //everything else
    UNDEFINED = 'undefined'
}

type CastrumType =
    'bastion' | 'conduit' | 'market' | 'nexus' | 'workshop' | 'undefined';

declare enum CIVITAS_TYPES {
    ARBITER = 'arbiter',
    CHEMIST = 'chemist',
    CONTRACTOR = 'contractor',
    COURIER = 'courier',
    CURATOR = 'curator',
    EMISSARY = 'emissary',
    EXCAVATOR = 'excavator',
    HOST = 'host',
    MINER = 'miner',
    SCHOLAR = 'scholar',
    SCOUT = 'scout',
}

type CivitasType =
    'arbiter' | 'chemist' | 'contractor' | 'courier' | 'curator' |
    'emissary' | 'excavator' | 'miner' | 'host' | 'scholar' | 'scout';

declare enum LEGION_TYPES {
    EXECUTIONER = 'executioner',
    GARRISON = 'garrison',
    JESTER = 'jester',
}

type LegionType =
    'executioner' | 'garrison' | 'jester';

declare enum REMOTE_STATUSES {
    SAFE = 'safe',
    DANGEROUS = 'dangerous',
    UNINTERESTING = 'uninteresting'
}

type LinkType =
    'storage' | 'controller' | 'container';

declare enum LINK_TYPES {
    STORAGE = 'storage',
    CONTROLLER = 'controller',
    CONTAINER = 'container'
}
