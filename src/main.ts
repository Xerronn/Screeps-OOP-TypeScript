import Imperator from './Imperator';
import Director from "./controllers/Director";
import Traveler from "./thirdParty/traveler"; Traveler;
declare global {
    namespace NodeJS {
        interface Global {
            Imperator: Imperator;
            logger: boolean;
        }
    }
}

global.Imperator = new Imperator();             // create a new Imperator instance that manages the whole dominion
global.Imperator.checkRespawn();                // check if the dominion needs to be initialized after a respawn
global.Imperator.initialize();                  // wrap all game objects and create room-level administrators

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


