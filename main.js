var roles = [
    require("role.harvester"),
    require("role.miner"),
    require("role.upgrader"),
    require("role.builder"),
    require("role.claimer"),
    require("role.conqueror"),
    require("role.reserver"),
    require("role.carrier"),
];

var constructionClaimSpawn = require("construction.claimSpawn");

var roomAi = require('roomai.base');

module.exports.loop = function() {
    for(var role of roles) {
        var creeps = _.filter(Game.creeps, (creep) => creep.memory.role == role.name);
        for(var creep of creeps) {
            role.run(creep);
        }
    }
    
    for(var roomName in Game.rooms) {
        roomAi(Game.rooms[roomName]).run();
    }
    constructionClaimSpawn.perform();

    if(Game.time % 100 == 50) {
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
    }
}