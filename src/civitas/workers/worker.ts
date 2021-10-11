import { Civitas } from '../civitas';

export class Worker extends Civitas {
    constructor(creep: Creep) {
        super(creep);
        this.memory;
    }

    update(): boolean {
        if (super.update()) return false;

        return false;
    }

    run(): boolean {
        return true;
    }
}
