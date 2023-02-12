const config = require('./config.json');
const playwright = require('playwright');
const DiscordRPC = require('discord-rpc');


DiscordRPC.register(config.clientID);


const rpc = new DiscordRPC.Client({ transport: 'ipc' });

rpc.on('ready', () => {

    playwright.chromium.launch().then(async (browser) => {
        console.log('Launching browser...');
    
        const page = await browser.newPage();
        let data = await getSteamPresence(page);
        if (data) {
            updateActivity(data);
        } else {
            console.log('User is not playing a game');
            // rpc.setActivity({
            //     details: 'User is not playing a game',
            //     state: 'User is not playing a game',
            //     largeImageKey: 'user',
            //     instance: false,
            //     buttons: [
            //         { label: 'Steam', url: `https://steamcommunity.com/profiles/${config.steamID}/` },
            //         { label: 'Game', url: `https://store.steampowered.com/app/` }
            //     ]
            // });
        }
    
    });
    
});

rpc.login({ clientId: config.clientID }).catch(console.error);



async function getSteamPresence(page) {

    await page.goto(`https://steamcommunity.com/profiles/${config.steamID}/`);


    try {
        await page.waitForSelector('div.playerAvatar');
        await page.hover('div.playerAvatar');
        await page.waitForSelector('div.miniprofile_hover');
        await page.screenshot({ path: 'save.png' });
        // das hier drüber ist nur zum testen!!
    } catch (error) {
        await page.screenshot({ path: 'saveERR.png' });
        // das hier drüber ist nur zum testen!!
    }

    // if div with class miniprofile_gamesection is found, then the user plays a game
    if (await page.$('div.miniprofile_gamesection')) {

        console.log('User is playing a game');

        await page.waitForSelector('img.game_logo');
        let element = await page.$('div.miniprofile_gamesection');
        let logo = await element.$eval('img.game_logo', (el) => el.src);
        // console.log(logo);
        let state = await element.$eval('span.game_state', (el) => el.innerText);
        let name = await element.$eval('span.miniprofile_game_name', (el) => el.innerText);
        let presence = await element.$eval('span.rich_presence', (el) => el.innerText);
        let gameID = logo.split('/')[5];

        // console.log(gameID);
        return {
            logo: logo,
            state: state,
            name: name,
            presence: presence,
            gameID: gameID
        }

        // const game = await page.$eval('div.miniprofile_gamesection', (el) => el.innerText);
        // console.log(game);
    } else {
        console.log('User is not playing a game');
        return false;
        // console.log(await page.innerHTML('body')) 
    }
}

function updateActivity(data) {
    let activity = {
        details: data.state,
        state: data.presence,
        largeImageKey: data.logo,
        largeImageText: data.name,
        instance: false,
        buttons: [
            { label: 'Steam', url: `https://steamcommunity.com/profiles/${config.steamID}/` },
            { label: 'Game', url: `https://store.steampowered.com/app/${data.gameID}/` }
        ]
    }
    // console.log(activity);
    rpc.setActivity(activity);
    
}