export class Informant {

    /**
     * Bunker schema adopted from HallowNest 2.0
     * @returns bunker Schema Object
     */
    static getBunkerSchema() {
        return {
            "road":{"pos":[{"x":0,"y":0},{"x":1,"y":1},{"x":2,"y":2},{"x":3,"y":3},
                {"x":4,"y":4},{"x":5,"y":5},{"x":6,"y":6},{"x":7,"y":7},{"x":8,"y":8},
                {"x":9,"y":9},{"x":10,"y":10},{"x":10,"y":0},{"x":9,"y":1},{"x":8,"y":2},
                {"x":7,"y":3},{"x":6,"y":4},{"x":4,"y":6},{"x":3,"y":7},{"x":2,"y":8},
                {"x":1,"y":9},{"x":0,"y":10},{"x":5,"y":0},{"x":4,"y":1},{"x":3,"y":2},
                {"x":2,"y":3},{"x":1,"y":4},{"x":0,"y":5},{"x":1,"y":6},{"x":2,"y":7},
                {"x":3,"y":8},{"x":4,"y":9},{"x":5,"y":10},{"x":6,"y":9},{"x":9,"y":6},
                {"x":10,"y":5},{"x":6,"y":1},{"x":7,"y":2},{"x":8,"y":3},{"x":9,"y":4}]},
            "tower":{"pos":[{"x":4,"y":5},{"x":3,"y":5},{"x":3,"y":6},{"x":6,"y":5},
                {"x":7,"y":5},{"x":7,"y":4}]},
            "spawn":{"pos":[{"x":4,"y":3},{"x":7,"y":6},{"x":4,"y":7}]},
            "storage":{"pos":[{"x":5,"y":4}]},
            "link":{"pos":[{"x":5,"y":2}]},
            "observer":{"pos":[{"x":5,"y":1}]},
            "powerSpawn":{"pos":[{"x":4,"y":2}]},
            "factory":{"pos":[{"x":6,"y":2}]},
            "terminal":{"pos":[{"x":6,"y":3}]},
            "lab":{"pos":[{"x":9,"y":8},{"x":8,"y":9},{"x":9,"y":7},{"x":8,"y":7},
                {"x":7,"y":9},{"x":7,"y":8},{"x":10,"y":8},{"x":10,"y":9},{"x":8,"y":10},
                {"x":9,"y":10}]},
            "nuker":{"pos":[{"x":3,"y":4}]},
            "extension":{"pos":[{"x":1,"y":0},{"x":2,"y":0},{"x":3,"y":0},{"x":4,"y":0},
                {"x":3,"y":1},{"x":2,"y":1},{"x":7,"y":0},{"x":8,"y":0},{"x":9,"y":0},
                {"x":6,"y":0},{"x":7,"y":1},{"x":8,"y":1},{"x":10,"y":4},{"x":10,"y":3},
                {"x":10,"y":1},{"x":10,"y":2},{"x":9,"y":2},{"x":9,"y":3},{"x":8,"y":4},
                {"x":8,"y":5},{"x":9,"y":5},{"x":8,"y":6},{"x":10,"y":6},{"x":10,"y":7},
                {"x":6,"y":10},{"x":7,"y":10},{"x":5,"y":9},{"x":4,"y":8},{"x":5,"y":8},
                {"x":6,"y":8},{"x":6,"y":7},{"x":5,"y":7},{"x":5,"y":6},{"x":1,"y":10},
                {"x":2,"y":10},{"x":4,"y":10},{"x":3,"y":10},{"x":3,"y":9},{"x":2,"y":9},
                {"x":0,"y":9},{"x":0,"y":8},{"x":1,"y":8},{"x":1,"y":7},{"x":0,"y":7},
                {"x":0,"y":6},{"x":2,"y":4},{"x":2,"y":6},{"x":2,"y":5},{"x":1,"y":5},
                {"x":0,"y":4},{"x":0,"y":3},{"x":1,"y":3},{"x":1,"y":2},{"x":0,"y":2},
                {"x":0,"y":1}]}
            };
    }

    /**
     * Method that takes a structure Constant and returns a corresponding wrapper type
     * @param structureType
     * @returns
     */
    static mapGameToClass(structureType: StructureConstant): CASTRUM_TYPES | undefined {
        switch (structureType) {
            case STRUCTURE_SPAWN:
                return CASTRUM_TYPES.NEXUS;
            case STRUCTURE_TOWER:
                return CASTRUM_TYPES.BASTION;
            case STRUCTURE_LINK:
                return CASTRUM_TYPES.CONDUIT;
            case STRUCTURE_LAB:
                return CASTRUM_TYPES.WORKSHOP;
            case STRUCTURE_TERMINAL:
                return CASTRUM_TYPES.MARKET;
            default:
                return undefined;
        }
    }
}
