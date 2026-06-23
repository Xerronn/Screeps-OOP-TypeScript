import Executive from "administrators/Executive";
import Supervisor from "administrators/Supervisor";

export default abstract class GameObj {
    abstract id: Id<any>;
    abstract liveObj: Creep | Structure
    abstract pos: RoomPosition
    abstract room: string
    abstract hits: number
    abstract hitsMax: number

    abstract update(): boolean;
    abstract run(): void;

    info() {
        return `${this.constructor.name} with ID ${this.id}`;
    }
}
