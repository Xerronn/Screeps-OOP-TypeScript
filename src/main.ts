import { Archivist } from "./administrators/archivist";
import { ErrorMapper } from "./thirdParty/ErrorMapper";
import { Imperator } from './administrators/imperator';
declare global {
    namespace NodeJS {
        interface Global {
            Imperator: Imperator;
            Archivist: Archivist;
            logger: boolean;
        }
    }
}
global.Imperator = new Imperator();

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    console.log(`Current game tick is ${Game.time}`);
});
