module.exports = {
    name: "healer",
    configs: [
        [HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE]
    ],
    run: function(creep) {
        if(creep.hits < creep.hitsMax) {
            this.heal(creep, creep);
            return;
        }
        
        var target = Game.creeps[creep.memory.target];
        if(target) {
            this.heal(creep, target);
        } else {
            this.findNewTarget(creep);
        }
    },
    heal: function(creep, target) {
        if(creep.heal(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
        }
    },
    findNewTarget: function(creep) {
        // TODO: find new target or be useful otherwise
    }
};