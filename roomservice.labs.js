const logistic = require("helper.logistic");

const DECOMPOSITIONS = {
    G: ["ZK", "UL"],

    ZK: ["Z", "K"],
    UL: ["U", "L"],
    OH: ["H", "O"],
    LH: ["L", "H"],
    LO: ["L", "O"],
    GH: ["G", "H"],
    GO: ["G", "O"],

    LH2O: ["LH", "OH"],
    LHO2: ["LO", "OH"],
    GH2O: ["GH", "OH"],
    GHO2: ["GO", "OH"],

    XLH2O: ["X", "LH2O"],
    XLHO2: ["X", "LHO2"],
    XGH2O: ["X", "GH2O"],
    XGHO2: ["X", "GHO2"]
}

function decompose(compound) {
    return DECOMPOSITIONS[compound];
}

function renderMineral(lab, resource, emptyIsGood) {
    let color = "#f00";
    if(resource === lab.mineralType || (lab.mineralType === null && emptyIsGood)) color = "#0f0";
    lab.room.visual.text(resource, lab.pos.x, lab.pos.y + 0.2, {
        color: color,
        stroke: "#000",
        align: "center",
        font: 0.5
    });
}

class Reactor {
    constructor(memory, labs) {
        this.memory = memory;
        this.labs = labs;
    }

    isValid() {
        return this.outputs.length > 0 && this.inputs.length === 2;
    }

    reactionPossible() {
        if(!this.isValid()) return false;
        if(!this.compound) return false;

        if(this.inputs[0].mineralType === null || !this.inputSatisfied(0)) return false;
        if(this.inputs[1].mineralType === null || !this.inputSatisfied(1)) return false;

        return true;
    }

    inputSatisfied(index) {
        if(!this.inputs[index]) return false;
        return this.inputs[index].mineralType === null || this.inputs[index].mineralType === this.baseMinerals[index];
    }

    get rallyPos() {
        if(!this.memory.rally) return null;
        return this.labs.room.getPositionAt(this.memory.rally[0], this.memory.rally[1]);
    }

    get outputs() {
        if(!this._outputs) {
            this._outputs = _.compact(_.map(this.memory.outputs, (id) => Game.getObjectById(id)));
            // TODO: find missing outputs
        }

        return this._outputs;
    }

    get inputs() {
        if(!this._inputs) {
            this._inputs = _.compact(_.map(this.memory.inputs, (id) => Game.getObjectById(id)));
        }

        return this._inputs;
    }

    setupReaction(compound, targetAmount) {
        this.memory.compound = compound;
        this.memory.targetAmount = targetAmount;
    }

    get compound() {
        return this.memory.compound;
    }

    get baseMinerals() {
        if(!this.compound) return [];
        return decompose(this.compound);
    }

    get targetAmount() {
        return this.memory.targetAmount;
    }

    react() {
        if(!this.isValid()) return false;
        if(!this.reactionPossible()) return false;

        for(let output of this.outputs) {
            output.runReaction(...this.inputs);
        }
        return true;
    }

    renderVisuals() {
        if(!this.isValid()) return;
        if(!this.compound) return;

        for(let output of this.outputs) {
            renderMineral(output, this.compound, true);
        }

        renderMineral(this.inputs[0], this.baseMinerals[0]);
        renderMineral(this.inputs[1], this.baseMinerals[1]);
    }

    findLabs(entranceDirection) {
        this.memory.outputs = [];
        this.memory.inputs = [];
        this._outputs = undefined;
        this._inputs = undefined;

        let relevantLabs = _.filter(this.labs.all, (l) => l.pos.getRangeTo(this.rallyPos) <= 1);
        for(let lab of relevantLabs) {
            let relativeX = lab.pos.x - this.rallyPos.x,
                relativeY = lab.pos.y - this.rallyPos.y;
            if((relativeX == entranceDirection.x && relativeY == 0) ||
                (relativeY == entranceDirection.y && relativeX == 0)) {
                this.memory.inputs.push(lab.id);
            } else {
                this.memory.outputs.push(lab.id);
            }
        }
    }
}

class Booster {
    constructor(memory, labs) {
        this.memory = memory;
        this.labs = labs;
    }

    isReady() {
        if(!this.lab) return false;
        if(!this.resource) return false;
        if(this.lab.mineralType !== this.resource) return false;

        return this.lab.energy >= LAB_BOOST_ENERGY && this.lab.mineralAmount >= LAB_BOOST_MINERAL;
    }
    
    needEnergy() {
        if(!this.lab) return false;
        
        return this.lab.energy < this.lab.energyCapacity;
    }
    
    needMineral() {
        if(!this.lab) return false;
        if(!this.resource) return false;
        if(this.lab.mineralType !== this.resource) return true;
        
        return this.lab.mineralAmount < this.lab.mineralCapacity;
    }

    get resource() {
        return this.memory.res;
    }

    set resource(value) {
        this.memory.res = value;
    }

    get lab() {
        if(this._lab === undefined) this._lab = Game.getObjectById(this.memory.lab);

        return this._lab;
    }

    renderVisuals() {
        if(!this.lab) return;
        if(!this.resource) return;

        renderMineral(this.lab, this.resource);
    }
}

module.exports = class Labs {
    constructor(room) {
        if(!room.memory.labs) {
            room.memory.labs = {
                reactor: null,
                boosters: []
            };
        }

        this.room = room;
        this.memory = room.memory.labs;
        this.all = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_LAB });
        this.decompose = decompose;
    }

    get reactor() {
        if(this._reactor === undefined) {
            if(this.memory.reactor) {
                this._reactor = new Reactor(this.memory.reactor, this);
            } else {
                this._reactor = null;
            }
        }

        return this._reactor;
    }

    get boosters() {
        if(!this._boosters) {
            this._boosters = _.map(this.memory.boosters, (mem) => new Booster(mem, this));
        }

        return this._boosters;
    }

    updateReactor(rally, entranceDirection) {
        if(!this.reactor || !this.reactor.rallyPos || this.reactor.rallyPos.x !== rally.x || this.reactor.rallyPos.y !== rally.y) {
            this.memory.reactor = {
                outputs: [],
                inputs: [],
                rally: [rally.x, rally.y]
            };
            this._reactor = undefined;
        }

        this.reactor.findLabs(entranceDirection);
    }

    setBooster(lab) {
        if(_.find(this.memory.boosters, (b) => b.lab == lab.id)) return;

        let memory = { lab: lab.id };
        this.memory.boosters.push(memory);
    }
}

const profiler = require("screeps-profiler");
profiler.registerClass(Reactor, 'Labs.Reactor');
profiler.registerClass(Booster, 'Labs.Booster');
profiler.registerClass(module.exports, 'Labs');
