export abstract class GameObj {
    abstract id: Id<any>;
    abstract liveObj: Creep | Structure | null;
    abstract pos: RoomPosition | null;
    abstract room: string | null;
    abstract hits: number | null;
    abstract hitsMax: number | null;

    abstract update(): boolean;
    abstract run(): boolean;

    info() {
        return `${this.constructor.name} with ID ${this.id}`;
    }
}
