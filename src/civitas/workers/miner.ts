import { Civitas } from '../civitas';

export class Miner extends Civitas {

    constructor(creep: Creep) {
        super(creep);
    }

    update(): boolean {
        if (super.update()) return false;


        return false;
    }
}
