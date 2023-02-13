const config = require('./config.json');
const playwright = require('playwright');
const DiscordRPC = require('discord-rpc');

DiscordRPC.register(config.clientID);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });

rpc.on('ready', () => {

    playwright.chromium.launch().then(async (browser) => {
        
        let page = await browser.newPage();
        
        let data = await getSteamPresence(page);
        if (data) {
            updateActivity(data);
        } else {
            console.log('User is not playing a game');
        }

        // start refresh interval
        setInterval(async () => {
            console.log('Checking for new game...');
            let data = await getSteamPresence(page);
            if (data) {
                updateActivity(data);
            } else {
                console.log('User is not playing a game');
                rpc.clearActivity();
            }
        }, config.refreshTime);

    });
    
});

rpc.login({ clientId: config.clientID }).catch(console.error);

async function getSteamPresence(page) {
    console.log('Getting user presence...');

    await page.goto(`https://steamcommunity.com/profiles/${config.steamID}/`);

    try {
        await page.waitForSelector('div.playerAvatar');
        await page.hover('div.playerAvatar');
        await page.waitForSelector('div.miniprofile_hover');
    } catch (error) {
    }

    // check if user is playing a game
    if (await page.$('div.miniprofile_gamesection')) {

        console.log('User is playing a game');

        // get game info
        await page.waitForSelector('img.game_logo');
        let element = await page.$('div.miniprofile_gamesection');
        let logo = await element.$eval('img.game_logo', (el) => el.src);
        let state = await element.$eval('span.game_state', (el) => el.innerText);
        let name = await element.$eval('span.miniprofile_game_name', (el) => el.innerText);
        let presence = await element.$eval('span.rich_presence', (el) => el.innerText);
        let gameID = logo.split('/')[5];

        return {
            logo: logo,
            state: state,
            name: name,
            presence: presence,
            gameID: gameID
        }
    } else return false;
}

function updateActivity(data) {
    console.log('Updating activity...');
    let activity = {
        details: data.name,
        state: data.presence,
        largeImageKey: data.logo,
        largeImageText: data.state,
        instance: false,
        buttons: [
            { label: 'Steam User', url: `https://steamcommunity.com/profiles/${config.steamID}/` },
            { label: 'Steam Game', url: `https://store.steampowered.com/app/${data.gameID}/` }
        ]
    }

    rpc.setActivity(activity).catch(error => {
        if(error) console.log(error)
        else console.log('Activity successfully updated!');
    });
}