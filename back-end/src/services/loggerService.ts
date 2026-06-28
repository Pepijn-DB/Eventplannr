const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const COLOR: Record<Level, string> = {
	debug: "\x1b[36m", // cyan
	info: "\x1b[32m", // green
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

const minLevel: Level = (process.env.LOG_LEVEL as Level) ?? "info";
const minRank = LEVELS[minLevel] ?? LEVELS.info;
const isTTY = process.stdout.isTTY;

function sanitizeMsg(msg: string): string {
	// Prevent CR/LF injection in TTY output
	return msg.replace(/[\r\n]/g, " ");
}

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
	if (LEVELS[level] < minRank) return;

	const ts = new Date().toISOString();
	msg = sanitizeMsg(msg);

	if (isTTY) {
		const color = COLOR[level];
		const prefix = `${color}[${level.toUpperCase()}]${RESET}`;
		const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
		process.stdout.write(`${ts} ${prefix} ${msg}${metaStr}\n`);
	} else {
		const entry: Record<string, unknown> = { ts, level, msg };
		if (meta) Object.assign(entry, meta);
		process.stdout.write(`${JSON.stringify(entry)}\n`);
	}
}

const logger = {
	debug: (msg: string, meta?: Record<string, unknown>) =>
		write("debug", msg, meta),
	info: (msg: string, meta?: Record<string, unknown>) =>
		write("info", msg, meta),
	warn: (msg: string, meta?: Record<string, unknown>) =>
		write("warn", msg, meta),
	error: (msg: string, meta?: Record<string, unknown>) =>
		write("error", msg, meta),
};

export default logger;
