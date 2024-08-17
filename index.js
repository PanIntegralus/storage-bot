const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

const { formatString } = require('./utils.js');

const config = require('./config.json');
const lang = require('./lang/' + config.chat.lang + '.json');

const bot = mineflayer.createBot({
    username: config.offlineUsername,
    auth: config.authType,
    host: config.server.host,
    port: config.server.port,
    version: config.server.version
});

bot.loadPlugin(pathfinder);

let initialPos = new Vec3(config.initialPos.x, config.initialPos.y, config.initialPos.z);
let doingTask = false;

const invMovements = new Movements(bot);
invMovements.canDig = false;
invMovements.canOpenDoors = false;
invMovements.allow1by1towers = false;
invMovements.blocksToAvoid = new Set([bot.registry.blocksByName.chest.id]);
invMovements.allowParkour = false;
invMovements.scafoldingBlocks = new Set([]);

bot.on('login', () => {
    for (const message of config.chat.onLogin) {
        bot.chat(message);
        bot.waitForTicks(config.chat.sleepTime);
    };
});

bot.on('spawn', () => {
    if (config.initialPos.onSpawn) {
        bot.pathfinder.setMovements(invMovements);
        bot.pathfinder.setGoal(new goals.GoalNear(config.initialPos.coords[0], config.initialPos.coords[1], config.initialPos.coords[2], 1));
    };
});

bot.on('whisper', async (username, message) => {
    const args = message.toLowerCase().split(' ');
    const command = args[0];

    if (command === 'buscar' || command === 'find' || command === 'busca') {
        if (doingTask) {
            bot.whisper(username, lang.alreadySearching);
            return;
        };

        if (args.length < 2) {
            bot.whisper(username, lang.invalidSearchParams);
            return;
        };

        const itemName = args.slice(1).join(' ');
        bot.whisper(username, formatString(lang.searchingFor, itemName));
        doingTask = true;
        await searchForItem(username, itemName);
    };

    if (command === 'depositar' || command === 'deposit' || command === 'deposita') {
        if (doingTask) {
            bot.whisper(username, lang.alreadyDepositing);
            return;
        };

        doingTask = true;
        await depositAllItems(username);
    }

    if (command === 'stop' || command === 'cancel' || command === 'detener' || command === 'para') {
        doingTask = false;
        bot.whisper(username, lang.searchStopped);
    };

    if (command === 'posicion' || command === 'savepos' || command === 'position') {
        initialPos = bot.entity.position;
        bot.whisper(username, formatString(lang.initialPosSet, initialPos));
    };

    if (command === 'goto') {
        if (args.length < 4) {
            return;
        };

        const gotoPos = new Vec3(args[1], args[2], args[3]);
        var gotoRange = 1;

        if (args[4]) {
            gotoRange = args[4];
        };

        const gotoMovements = new Movements(bot);
        gotoMovements.canDig = false;
        gotoMovements.allowFreeMotion = true;
        bot.pathfinder.setMovements(gotoMovements);
        
        bot.pathfinder.setGoal(new goals.GoalNear(gotoPos.x, gotoPos.y, gotoPos.z, gotoRange));
        bot.whisper(username, formatString(lang.goalSet, gotoPos));
        bot.once('goal_reached', () => { 
            bot.whisper(username, lang.goalReached);
        });
    };

    if (command === 'stop') {
        doingTask = false;
        bot.pathfinder.setGoal(null);
        bot.whisper(username, lang.pathStopped);
    };

    if (command === 'tossall') {
        bot.whisper(username, lang.droppingItems);
        for (const item of bot.inventory.items()) {
            await bot.toss(item.type, null, item.count);
        };
    };
});

async function searchForItem(username, itemName) {
    bot.pathfinder.setMovements(invMovements);

    const chests = bot.findBlocks({
        matching: bot.registry.blocksByName.chest.id,
        maxDistance: 100,
        count: 100000
    });

    chests.sort((a, b) => a.z - b.z);

    for (const pos of chests) {
        if (bot.inventory.items().length >= bot.inventory.slots.length) {
            break;
        };

        if (!isInsideValidRegion(pos)) continue;

        bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 5));

        await new Promise(resolve => {
            bot.once('goal_reached', resolve);
        });

        const block = bot.blockAt(pos);
        const chest = await bot.openContainer(block);

        if (!chest) {
            bot.whisper(username, `Unable to open chest at ${pos}.`);
            bot.waitForTicks(20); // this is so the server doesn't kick it for spamming. dumb gaming
            continue;
        };

        try {
            for (const item of chest.containerItems()) {
                if (item.name === itemName) {
                    if (bot.inventory.items().length >= bot.inventory.slots.length) {
                        break;
                    };
                    await chest.withdraw(item.type, null, item.count);
                };
            };
        } catch (err) {
            if (err.message.toLowerCase().includes('inventory is full')) {
                break;
            };
            console.log(formatString(lang.unableToProcessChest, pos, err.message));
        } finally {
            await chest.close();
        };
    };

    if (initialPos) {
        bot.pathfinder.setGoal(new goals.GoalNear(config.initialPos.coords[0], config.initialPos.coords[1], config.initialPos.coords[2], 1));

        await new Promise(resolve => {
            bot.once('goal_reached', resolve);
        });

        let players = bot.players;
        let distanceBetween = bot.entity.position.distanceTo(players[username].entity.position);
        if (distanceBetween < 10) {
            bot.lookAt(players[username].entity.position);
        };

        for (const item of bot.inventory.items()) {
            await bot.toss(item.type, null, item.count);
        };
    };

    if (!doingTask) return;

    bot.whisper(username, lang.searchFinished);
    doingTask = false;
};

async function depositAllItems(username) {
    const items = bot.inventory.items();

    bot.pathfinder.setMovements(invMovements);

    const chests = bot.findBlocks({
        matching: bot.registry.blocksByName.chest.id,
        maxDistance: 100,
        count: 100000
    });

    chests.sort((a, b) => a.z - b.z);

    for (const pos of chests) {
        if (bot.inventory.items().length === 0) {
            break;
        };

        if (!isInsideValidRegion(pos)) continue;

        bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 4));

        await new Promise(resolve => {
            bot.once('goal_reached', resolve);
        });

        const block = bot.blockAt(pos);
        const chest = await bot.openContainer(block);

        const availableSlot = chest.firstEmptyContainerSlot() !== null;
        if (!availableSlot) {
            continue;
        };

        try {
            for (const item of items) {
                const availableSlot = chest.firstEmptyContainerSlot() !== null;
                if (!availableSlot) {
                    break;
                };

                await chest.deposit(item.type, null, item.count);
            }
        } catch (err) {
            if (err.message.toLowerCase().includes('destination full')) {
                break;
            }
            console.log(formatString(lang.unableToProcessChest, pos, err.message));
        } finally {
            await chest.close();
        };
    };

    bot.whisper(username, lang.depositFinished);
    doingTask = false;

    bot.pathfinder.setGoal(new goals.GoalNear(config.initialPos.coords[0], config.initialPos.coords[1], config.initialPos.coords[2], 1));
};

function isInsideValidRegion(pos) {
    const region = config.validStorageChests;
    const corner1 = new Vec3(region.corner1[0], region.corner1[1], region.corner1[2]);
    const corner2 = new Vec3(region.corner2[0], region.corner2[1], region.corner2[2]);

    const minX = Math.min(corner1.x, corner2.x);
    const maxX = Math.max(corner1.x, corner2.x);
    const minY = Math.min(corner1.y, corner2.y);
    const maxY = Math.max(corner1.y, corner2.y);
    const minZ = Math.min(corner1.z, corner2.z);
    const maxZ = Math.max(corner1.z, corner2.z);

    return pos.x >= minX && pos.x <= maxX &&
           pos.y >= minY && pos.y <= maxY &&
           pos.z >= minZ && pos.z <= maxZ;
}