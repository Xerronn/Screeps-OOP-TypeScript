declare enum CASTRUM_TYPES {
    BASTION = 'bastion',
    CONDUIT = 'conduit',
    MARKET = 'market',
    NEXUS = 'nexus',
    WORKSHOP = 'workshop',
    UNDEFINED = 'undefined'
}

declare type CastrumType =
    'bastion' | 'conduit' | 'market' | 'nexus' | 'workshop' | 'undefined';

declare enum CIVITAS_TYPES {
    ARBITER = 'arbiter',
    CHEMIST = 'chemist',
    CONTRACTOR = 'contractor',
    COURIER = 'courier',
    CURATOR = 'curator',
    EMISSARY = 'emissary',
    EXCAVATOR = 'excavator',
    MINER = 'miner',
    RUNNER = 'runner',
    SCHOLAR = 'scholar',
    SCOUT = 'scout',
}

declare type CivitasType =
    'arbiter' | 'chemist' | 'contractor' | 'courier' | 'curator' |
    'emissary' | 'excavator' | 'miner' | 'runner' | 'scholar' | 'scout';

declare enum LEGION_TYPES {
    EXECUTIONER = 'executioner',
    GARRISON = 'garrison',
    JESTER = 'jester',
}

declare type LegionType =
    'executioner' | 'garrison' | 'jester';

declare enum REMOTE_STATUSES {
    SAFE = 'safe',
    DANGEROUS = 'dangerous',
    UNINTERESTING = 'uninteresting'
}
