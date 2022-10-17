export enum ReturnCode {
    ERR_MISSING_WORK = -3,
    ERR_INCOMPATIBLE_STRUCTURE = -2,
    ERR = -1,
    IN_PROGRESS = 0,
    SUCCESS = 1
}

export enum CreepAction {
    BUILD = 'build',
    UPGRADE = 'upgrade',
    TRANSFER = 'transfer'
}