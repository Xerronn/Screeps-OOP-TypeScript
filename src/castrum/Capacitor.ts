//can't really extend castrum because this will be a collection of structures acting as one
export default class Capacitor {
    room: string;
    type: string;
    extensions: Id<StructureExtension>[];
    center: Position;

    constructor(extensionStamp: StampPlacement, room: string) {
        this.room = room;
        this.type = CASTRUM_TYPES.CAPACITOR;
        this.center = {
            x: extensionStamp.anchor.x + 1, 
            y: extensionStamp.anchor.y + 1
        }
        let area = Game.rooms[room].lookAtArea(
            extensionStamp.anchor.y, 
            extensionStamp.anchor.x, 
            extensionStamp.anchor.y + 2, 
            extensionStamp.anchor.x + 2, 
            true
            );
        
        let extensions: Id<StructureExtension>[] = [];
        for (let res of area) {
            if (res.structure?.structureType === STRUCTURE_EXTENSION) {
                extensions.push(res.structure.id as Id<StructureExtension>);
            }
        }
        this.extensions = extensions;
    }

    update() {

    }

    run() {
    }
}