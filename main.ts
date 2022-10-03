import { readJsonSync, writeJSON } from "fs-extra";
import { Channel, Client, GuildEmoji, Partials, TextChannel } from 'discord.js';
import { GatewayIntentBits } from "discord-api-types/gateway/v10";
import { setTimeout as wait } from "node:timers/promises"
import { ChannelType } from "discord-api-types/v10";

interface BotData{
	clientId: string,
	guildId: string,
	token: string,
	targetChannel: string,
	targetID: string
}
enum roles{
	ENGINEER = "1024764856466931712",
	SAILOR = "915618245518688307"
}
const config: BotData = readJsonSync("config.json");

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
async function getChannel(){
	let iter = 0;
	async function trygetChannel(): Promise<Function | Channel> {
		
		let channel = await client.channels.fetch(config.targetChannel);
		if(!channel && iter < 5){
			await wait(2000);
			iter++;
			return await trygetChannel();
		}else if(!channel||channel.type !== ChannelType.GuildText){
			throw "Target channel is unreachable or of wrong type";
		}else{
			return channel;
		}
	}
	return await trygetChannel();
}


async function init(){
	const channel = await getChannel() as TextChannel;
	
	if(!config.targetID){
		const message = await channel.send("To get added to one of the game announcement roles, please click a reaction to add the role to yourself.");
		config.targetID = message.id
		await writeJSON("config.json", config);
		await message.react(message.guild.emojis.cache.find(emoji => emoji.name === "Factorio") as GuildEmoji);
		await message.react(message.guild.emojis.cache.find(emoji => emoji.name === "Barotrauma") as GuildEmoji);
		//console.log(message.channel.permissionsFor(message.member)?.has("MANAGE_ROLES"))
	}
	const message = await (client.channels.cache.get(config.targetChannel) as TextChannel).messages.fetch(config.targetID);
	message.client.on("messageReactionAdd", (reaction, user)=>{
		if(user.id === config.clientId){
			return;
		}
		switch(reaction.emoji.name){
			case "Factorio":
				message.guild.members.fetch(user.id)
					.then(member => member.roles.add(roles.ENGINEER));
			break;
			case "Barotrauma":
				message.guild.members.fetch(user.id)
					.then(member => member.roles.add(roles.SAILOR));
			break;
		}
	});
	message.client.on("messageReactionRemove", (reaction, user)=>{
		if(user.id === config.clientId){
			return;
		}
		switch(reaction.emoji.name){
			case "Factorio":
				message.guild.members.fetch(user.id)
					.then(member => member.roles.remove(roles.ENGINEER));
			break;
			case "Barotrauma":
				message.guild.members.fetch(user.id)
					.then(member => member.roles.remove(roles.SAILOR));
			break;
		}
	});
}
client.once("ready", ()=>{
	init();
});
client.login(config.token);