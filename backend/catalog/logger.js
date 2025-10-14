// logger.js
const { createLogger, format, transports } = require('winston');
const chalk = require('chalk');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ level, message, timestamp }) => {
      const color =
        level === 'error'
          ? chalk.red
          : level === 'warn'
          ? chalk.yellow
          : level === 'info'
          ? chalk.cyan
          : chalk.white;
      return `${chalk.gray(timestamp)} ${color(`[${level.toUpperCase()}]`)} ${message}`;
    })
  ),
  transports: [new transports.Console()],
});

module.exports = logger;


///