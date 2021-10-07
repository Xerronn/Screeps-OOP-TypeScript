import { Archivist } from "./administrators/archivist";
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
export const loop = () => {
    console.log(`Current game tick is ${Game.time}`);
};
