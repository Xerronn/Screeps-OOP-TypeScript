import { Archivist } from "./administrators/archivist";
import { Imperator } from './administrators/imperator';
import { Director } from "./administrators/director";
declare global {
    namespace NodeJS {
        interface Global {
            Imperator: Imperator;
            logger: boolean;
        }
    }
}


global.Imperator = new Imperator();
Archivist.build();

function mainLoop(): void {
    global.Imperator.refresh();
    Director.run();
    global.Imperator.run();
}

function globalReset(): void {
    console.log("<b>--------Global Reset--------</b>");
}

export const loop = mainLoop;

globalReset();


