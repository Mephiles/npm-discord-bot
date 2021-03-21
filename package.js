const Discord = require('discord.js');
const OptionsValidator = require('gk-options-validator');

OPTIONS_TEMPLATE = {
	debug: 'boolean',
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
		showCallstack: 'boolean',
		multiEmbedControlAuthorOnly: 'boolean',
		commandPrefixMaxLength: {
			type: 'number',
			minValue: 0,
		},
		commandMaxLength: {
			type: 'number',
			minValue: 0,
		},
		defaultLogCount: {
			type: 'number',
			minValue: 1,
		},
		dateFormat: {
			type: 'string',
			acceptedValues: ['EU', 'ISO', 'US'],
		},
	},
};

class DiscordBot {
	// Static options
	static COMMAND_PREFIX_MAX_LENGTH = 1;
	static MAX_COMMAND_LENGTH = 6;
	static SHOW_CALLSTACK = true;
	static DEFAULT_LOGS_COUNT = 10;
	static DATE_FORMAT = 'EU';

	// Options
	BOT_NAME = 'Bot';
	BOT_AUTHOR = 'Gregor Kaljulaid';
	DEBUG_MODE = false;
	CHANNEL_NAME;
	COMMAND_PREFIX;
	COMMAND;
	MULTI_EMBED_CONTORL_AUTHOR_ONLY = false;
	BOT_COLOR = '#0099ff';

	// Data
	LOGS = [];
	CLIENT;
	SUB_CLASS_PROCESS_MESSAGE_FUNCTION;

	// Static data
	static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	static IN_MILLISECONDS = {
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000,
		second: 1000,
	};

	constructor(options) {
		const botOptions = new OptionsValidator(OPTIONS_TEMPLATE, options).ToObject();
		this.SetupOptions(botOptions);
		const clientPregiven = 'client' in botOptions;

		this.Log(`[Init] Starting bot: ${this.BOT_NAME}.`, true);
		this.Log(`[Init] Client: ${clientPregiven}`);

		if (!clientPregiven) {
			this.Log(`[Init] Creating client.`);
			this.CLIENT = new Discord.Client();

			// Client setup
			this.CLIENT.on('ready', () => {
				this.Log(`Logged in as ${this.CLIENT.user.tag}`);
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
		this.Log(`[Init] Initializing finished.`);
	}

	SetupOptions(options) {
		this.BOT_NAME = options.botName;
		this.BOT_AUTHOR = options.botAuthor;
		this.DEBUG_MODE = options.debugMode;
		this.CHANNEL_NAME = options.channelName;
		this.COMMAND_PREFIX = options.commandPrefix;
		this.COMMAND = options.command;
		this.MULTI_EMBED_CONTORL_AUTHOR_ONLY = options.multiEmbedControlAuthorOnly;
		this.BOT_COLOR = options.botColor;

		// Override
		Bot.COMMAND_PREFIX_MAX_LENGTH = options.override?.commandPrefixMaxLength ?? Bot.COMMAND_PREFIX_MAX_LENGTH;
		Bot.MAX_COMMAND_LENGTH = options.override?.maxCommandLength ?? Bot.MAX_COMMAND_LENGTH;
		Bot.SHOW_CALLSTACK = options.override?.showCallstack ?? Bot.SHOW_CALLSTACK;
		Bot.DEFAULT_LOGS_COUNT = options.override?.defaultLogCount ?? Bot.DEFAULT_LOGS_COUNT;
		Bot.DATE_FORMAT = options.override?.dateFormat ?? Bot.DATE_FORMAT;
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

		this.Log(
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
			// 		`${TravelBot.BOT_NAME} is currently under construction. Unexpected responses may occur.`
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

	Log(msg, overrideDebug) {
		const log = {
			date: Bot.FormatDate(new Date()),
			message: msg,
		};

		this.LOGS.push(log);

		if (this.DEBUG_MODE || overrideDebug) {
			console.log(`[${this.BOT_NAME}] ${msg}`);
		}
	}

	GetLogs(lastX) {
		lastX = lastX !== undefined ? lastX : Bot.DEFAULT_LOGS_COUNT;
		lastX = lastX > this.LOGS.length ? this.LOGS.length : lastX;
		return this.LOGS.slice(this.LOGS.length - lastX);
	}

	DisplayLogs(commandOptions, channel) {
		let lastX =
			commandOptions !== null && !isNaN(parseInt(commandOptions)) && parseInt(commandOptions) > 0
				? parseInt(commandOptions)
				: Bot.DEFAULT_LOGS_COUNT;
		lastX = lastX > this.LOGS.length ? this.LOGS.length : lastX;
		const logs = this.GetLogs(lastX);

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(`${Bot.BOT_NAME} - Info`)
			.addField(
				`${Bot.BOT_NAME} logs (last ${lastX})`,
				`${logs.map((log) => `${log.date} - ${log.message}`).join('\n')}`
			)
			.setFooter(`Brought to you by: Mephiles [2087524]`);
		channel.send(embed);
	}

	// Static functions

	static NumberWithCommas(x, shorten = true) {
		if (!shorten) return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

		if (Math.abs(x) >= 1e9) {
			if (Math.abs(x) % 1e9 == 0) return (x / 1e9).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'bil';
			else return (x / 1e9).toFixed(3) + 'bil';
		} else if (Math.abs(x) >= 1e6) {
			if (Math.abs(x) % 1e6 == 0) return x / 1e6 + 'mil';
			else return (x / 1e6).toFixed(3) + 'mil';
		} else if (Math.abs(x) >= 1e3) {
			if (Math.abs(x) % 1e3 == 0) return x / 1e3 + 'k';
		}

		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}

	static FormatDate(date) {
		const year = date.getFullYear(),
			month = (date.getMonth() + 1).toString().length !== 1 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1),
			day = date.getDate().toString().length !== 1 ? date.getDate() : '0' + date.getDate(),
			hours = date.getHours().toString().length !== 1 ? date.getHours() : '0' + date.getHours(),
			minutes = date.getMinutes().toString().length !== 1 ? date.getMinutes() : '0' + date.getMinutes(),
			seconds = date.getSeconds().toString().length !== 1 ? date.getSeconds() : '0' + date.getSeconds();

		switch (Bot.DATE_FORMAT) {
			case 'EU':
				return `(${day}.${month}.${year}) ${hours}:${minutes}:${seconds}`;
			case 'US':
				return `(${month}/${day}/${year}) ${hour % 12 || 12}:${minutes}:${seconds} ${hour < 12 ? 'AM' : 'PM'}`;
			case 'ISO':
				return `(${year}-${month}-${day}) ${hours}:${minutes}:${seconds}`;
			default:
				return `(${year}-${month}-${day}) ${hours}:${minutes}:${seconds}`;
		}
	}

	static TimeAgo(time) {
		switch (typeof time) {
			case 'number':
				break;
			case 'string':
				time = +new Date(time);
				break;
			case 'object':
				if (time.constructor === Date) time = time.getTime();
				break;
			default:
				time = +new Date();
		}
		let time_formats = [
			[60, 'sec', 1], // 60
			[120, '1min ago', '1min from now'], // 60*2
			[3600, 'min', 60], // 60*60, 60
			[7200, '1h ago', '1h from now'], // 60*60*2
			[86400, 'h', 3600], // 60*60*24, 60*60
			[172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
			[604800, 'd', 86400], // 60*60*24*7, 60*60*24
			[1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
			[2419200, 'w', 604800], // 60*60*24*7*4, 60*60*24*7
			[4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
			[29030400, 'mon', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
			[58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
			[2903040000, 'y', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
			[5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
			[58060800000, 'cen', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
		];
		let seconds = (+new Date() - time) / 1000,
			token = 'ago',
			list_choice = 1;

		if (seconds == 0) {
			return 'Just now';
		}
		if (seconds < 0) {
			seconds = Math.abs(seconds);
			token = 'from now';
			list_choice = 2;
		}
		let i = 0,
			format;
		while ((format = time_formats[i++]))
			if (seconds < format[0]) {
				if (typeof format[2] == 'string') return format[list_choice];
				else return Math.floor(seconds / format[2]) + '' + format[1] + ' ' + token;
			}
		return time;
	}
}

module.exports = DiscordBot;
