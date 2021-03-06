import Chronicler from 'controllers/Chronicler';
import Director from 'controllers/Director';
import Worker, {WorkerMemory} from './Worker';

interface EmissaryMemory extends WorkerMemory {
    task: 'reserve' | 'catchup' | 'claim' | 'done';
}

export default class Emissary extends Worker {
    memory: EmissaryMemory;

    constructor(emissary: Creep) {
        super(emissary);
    }

    run() {
        //march to room and flee if enemies
        if (this.fleeing) {
            return this.march(this.spawnRoom, true);
        }

        if (!this.arrived) {
            return this.march(this.assignedRoom);
        }

        let controller = Game.rooms[this.room].controller;

        if (controller === undefined) throw Error('Assigned Room controller does not exist');
        switch (this.memory.task) {
            case 'claim':
                this.claim(controller);
                break;
            case 'reserve':
            case 'catchup':
                this.reserve(controller);
                break;
            case 'done':
                global.Imperator.initializeRoom(this.assignedRoom, this.spawnRoom);
                this.liveObj.suicide();
                break;
        }

        //make sure to spawn new emissary before the current one dies, to maintain 100% uptime
        let travelTime = this.memory.travelTime || 0;
        let nextTime = travelTime + this.body.length * CREEP_SPAWN_TIME;
        if (this.memory.generation !== undefined && this.memory.travelTime && this.ticksToLive <= nextTime) {
            //basically rebirth but without the dying first

            let task = `
                global.Imperator.administrators[\"` + this.spawnRoom + `\"].supervisor.initiate({
                    'body': objArr[0],
                    'type': objArr[1],
                    'memory': objArr[2]
                });
            `

            let reservedTicks = 100;
            if (controller.reservation?.username !== 'Invader') {
                reservedTicks = Game.rooms[this.assignedRoom].controller?.reservation?.ticksToEnd || 100;
            }
            Director.schedule(this.spawnRoom, Game.time + reservedTicks - (travelTime * 2), task, [[...this.body], this.memory.type, {...this.memory}]);
            //no more rebirth for you
            delete this.memory.generation;
        }
        return;
    }

    /**
     * Method that travels to the room controller and reserves it
     */
    reserve(controller: StructureController) {
        if (this.pos.inRangeTo(controller, 1)) {
            if (this.memory.travelTime === undefined) {
                this.memory.travelTime = Game.time - this.spawnTime;
            }
            if (controller.sign?.username !== this.liveObj.owner.username) {
                this.sign(controller);
            }
            if (controller.reservation?.username === 'Invader') {
                this.liveObj.attackController(controller);
            } else this.liveObj.reserveController(controller);
        } else {
            this.liveObj.travelTo(controller);
        }
    }

    /**
     * Method that travels to the room controller and claims it
     */
    claim(controller: StructureController) {
        if (this.pos.inRangeTo(controller, 1)) {
            this.liveObj.claimController(controller);
            this.sign(controller);
            //disable rebirth because this creep will never need to come back
            delete this.memory.generation;
            this.memory.task = 'done';
        } else {
            this.liveObj.travelTo(controller);
        }
    }

    /**
     * Method to sign the controller with a latin saying
     */
    sign(controller: StructureController) {
        let choices = [
            "Omnium Rerum Principia Parva Sunt",                            //The beginnings of all things are small.
            "Pecunia Nervus Belli",                                         //Money is the soul (or sinew) of war
            "Male Parta Male Dilabuntur",                                   //What has been wrongly gained is wrongly lost
            "Aere Perennius",                                               //More lasting than bronze
            "Nil Desperandum",                                              //Never despair!
            "Timendi Causa Est Nescire",                                    //The cause of fear is ignorance
            "Per Aspera Ad Astra",                                          //Through hardship to the stars
            "Vitam Impendere Vero",                                         //Dedicate your life to truth
            "Ars Longa, Vita Brevis",                                       //Art is long, life is short
            "Alea Jacta Est",                                               //The die is cast
            "Festina lente",                                                //Make haste slowly
            "Una salus victis nullam sperare salutem",                      //The one well being of the defeated is to not hope for well being
            "Optimum est pati quod emendare non possis",                    //It is best to endure what you cannot change
            "Quod scripsi, scripsi",                                        //What I have written, I have written
            "Quemadmoeum gladis nemeinum occidit, occidentis telum est",    //a sword is never a killer, it is a tool in a killer's hand
            "Flamma fumo est proxima",                                      //Where there is smoke, there is fire
            "Multi famam, conscientiam pauci verentur"                      //Many fear their reputation, few their conscience
        ]

        if (this.pos.inRangeTo(controller, 1)) {
            //selected a random message from the message array then sign it with that message
            let selectedMessage = choices[Math.floor(Math.random() * choices.length)];
            this.liveObj.signController(controller, selectedMessage);
        } else {
            this.liveObj.travelTo(controller);
        }
    }
}