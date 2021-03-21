const Discord = require('discord.js');
const Utilities = require('gk-utilities');
const OptionsValidator = require('gk-options-validator');
const App = require('gk-app');

const DISCORD_BOT_OPTIONS_TEMPLATE = {
	channelName: 'string',
	client: {
		type: Discord.Client,
	},
	commandPrefix: {
		type: 'string',
		minLength: 0,
		maxLength: 1,
	},
	command: {
		type: 'string',
		minLength: 0,
		maxLength: 6,
	},
	botColor: {
		type: 'string',
		regexFormat: /#\d{3|6}/,
	},
	auth: {
		client_id: {
			type: 'string',
		},
		token: {
			type: 'string',
		},
	},
	override: {
		multiEmbedControlAuthorOnly: 'boolean',
		commandPrefixMaxLength: {
			type: 'number',
			minValue: 0,
		},
		commandMaxLength: {
			type: 'number',
			minValue: 0,
		},
	},
};

class DiscordBot extends App {
	// Dynamic options
	BOT_AUTHOR = 'Gregor Kaljulaid';
	CHANNEL_NAME;
	COMMAND_PREFIX;
	COMMAND;
	MULTI_EMBED_CONTORL_AUTHOR_ONLY = false;
	BOT_COLOR = '#0099ff';
	COMMAND_PREFIX_MAX_LENGTH = 1;
	MAX_COMMAND_LENGTH = 6;

	// Data
	CLIENT;
	SUB_CLASS_PROCESS_MESSAGE_FUNCTION;

	constructor(options) {
		super(options);
		const botOptions = new OptionsValidator(DISCORD_BOT_OPTIONS_TEMPLATE, options).ToObject();
		this.SetupOptions(botOptions);
		const clientPregiven = 'client' in botOptions;

		super.Log(`[Init] Client: ${clientPregiven}`);

		if (!clientPregiven) {
			super.Log(`[Init] Creating client.`);
			this.CLIENT = new Discord.Client();

			// Client setup
			this.CLIENT.on('ready', () => {
				super.Log(`Logged in as ${this.CLIENT.user.tag}`);
			});

			this.CLIENT.on('message', (msg) => {
				this.SUB_CLASS_PROCESS_MESSAGE_FUNCTION !== undefined
					? this.SUB_CLASS_PROCESS_MESSAGE_FUNCTION(msg)
					: this.ProcessMessage(msg);
			});
			this.CLIENT.login(botOptions.auth.token);
		} else {
			this.CLIENT = botOptions.client;
		}
		super.Log(`[Init] Initializing finished.`);
	}

	SetupOptions(options) {
		this.BOT_AUTHOR = options.botAuthor;
		this.CHANNEL_NAME = options.channelName;
		this.COMMAND_PREFIX = options.commandPrefix;
		this.COMMAND = options.command;
		this.MULTI_EMBED_CONTORL_AUTHOR_ONLY = options.multiEmbedControlAuthorOnly;
		this.BOT_COLOR = options.botColor;

		// Override
		this.COMMAND_PREFIX_MAX_LENGTH = options.override?.commandPrefixMaxLength ?? this.COMMAND_PREFIX_MAX_LENGTH;
		this.MAX_COMMAND_LENGTH = options.override?.maxCommandLength ?? this.MAX_COMMAND_LENGTH;
	}

	ProcessMessage(msg, customActions) {
		// Check channel name and command prefix
		if (this.CHANNEL_NAME !== undefined && this.CHANNEL_NAME !== msg.channel.name) {
			return;
		}
		if (this.COMMAND_PREFIX !== undefined && msg.content[0] !== this.COMMAND_PREFIX) {
			return;
		}

		const args = msg.content.replace(this.COMMAND_PREFIX, '').split(/\s/g);
		const cmd = args[0] || null;
		const subCommand = args[1] || null;
		const commandOptions = args[2] || null;

		if (this.COMMAND !== undefined && cmd !== this.COMMAND) return;
		if (subCommand === null) {
			return msg.channel.send(
				`Missing command. Try '${this.COMMAND_PREFIX}${this.COMMAND} help' to see commands.`
			);
		}

		const actions = {
			ping: () => {
				msg.channel.send('Pong!');
			},
			isbotup: () => {
				msg.channel.send(`Oops.. sorry.. it's not what it looks like.. What can I help you with?`);
			},
			help: () => {
				this.DisplayHelpPage(msg.channel);
			},
			'?': () => {
				this.DisplayHelpPage(msg.channel);
			},
			logs: () => {
				this.DisplayLogs(commandOptions, msg.channel);
			},
		};

		super.Log(
			`Arguments: [${args}]. Command: [${cmd}]. Sub-command: [${subCommand}]. CommandOptions: [${commandOptions}]`
		);

		if (subCommand in actions) {
			actions[subCommand]();
		} else if (customActions !== undefined && subCommand in customActions) {
			customActions[subCommand]();
		} else {
			// Show warning message when in debug mode
			// if (this.DEBUG_MODE) {
			// 	msg.channel.send(
			// 		`${} is currently under construction. Unexpected responses may occur.`
			// 	);
			// }

			msg.channel.send(`Unknown command. Try '${this.COMMAND_PREFIX}${this.COMMAND} help' to see commands.`);
		}
	}

	MultiplePageEmbed(msg, pages, embed) {
		const list = async (listMsg, page) => {
			embed
				.setColor(this.BOT_COLOR)
				.setTitle(pages[page - 1])
				.setFooter(`Brought to you by ${this.BOT_AUTHOR}`);

			if (listMsg) {
				await listMsg.edit(embed);
			} else {
				listMsg = await msg.channel.send(embed);
			}

			// Set up page reactions.
			const lFilter = (reaction, user) => {
				reaction.emoji.name === '◀' &&
					page !== 1 &&
					(!this.MULTI_EMBED_CONTORL_AUTHOR_ONLY ||
						(MULTI_EMBED_CONTORL_AUTHOR_ONLY && user.id === msg.author.id));
			};
			const lCollector = listMsg.createReactionCollector(lFilter, {
				max: 1,
			});

			lCollector.on('collect', async () => {
				rCollector.stop();
				await listMsg.reactions.removeAll();
				list(listMsg, page - 1);
			});

			const rFilter = (reaction, user) => {
				reaction.emoji.name === '▶' &&
					typesSorted.length > page &&
					(!this.MULTI_EMBED_CONTORL_AUTHOR_ONLY ||
						(MULTI_EMBED_CONTORL_AUTHOR_ONLY && user.id === msg.author.id));
			};
			const rCollector = listMsg.createReactionCollector(rFilter, {
				max: 1,
			});

			rCollector.on('collect', async () => {
				lCollector.stop();
				await listMsg.reactions.removeAll();
				list(listMsg, page + 1);
			});

			if (page !== 1) await listMsg.react('◀');
			if (pages.length > page) await listMsg.react('▶');
		};

		list(undefined, 1);
	}

	DisplayHelpPage(channel) {
		const commandTemplate = `${this.COMMAND_PREFIX}${this.COMMAND} [command] [options]`;
		const commandExamples = [
			`${this.COMMAND_PREFIX}${this.COMMAND} ping - responds 'Pong!'`,
			`${this.COMMAND_PREFIX}${this.COMMAND} isbotup - to check if bot is up`,
			`${this.COMMAND_PREFIX}${this.COMMAND} help - display help page`,
			`${this.COMMAND_PREFIX}${this.COMMAND} ? - display help page`,
			`${this.COMMAND_PREFIX}${this.COMMAND} logs [count] - display logs`,
		];

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(`${this.BOT_NAME} - Help`)
			.addField(commandTemplate, `${commandExamples.join('\n')}`)
			.setFooter(`Brought to you by ${this.BOT_AUTHOR}`);
		channel.send(embed);
	}

	BindProcessMessage(subClassProcessMessageFunction) {
		this.SUB_CLASS_PROCESS_MESSAGE_FUNCTION = subClassProcessMessageFunction;
	}

	// Helper functions
	DisplayLogs(commandOptions, channel) {
		let lastX =
			commandOptions !== null && !isNaN(parseInt(commandOptions)) && parseInt(commandOptions) > 0
				? parseInt(commandOptions)
				: undefined;
		const logs = super.GetLogs(lastX);

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(`${this.BOT_NAME} - Info`)
			.addField(
				`${this.BOT_NAME} logs (last ${lastX})`,
				`${logs.map((log) => `${log.date} - ${log.message}`).join('\n')}`
			)
			.setFooter(`Brought to you by: Mephiles [2087524]`);
		channel.send(embed);
	}
}

module.exports = DiscordBot;
