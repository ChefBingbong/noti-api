import { createLogger, format, Logger, transports } from "winston";
const chalk = require('chalk')

let logger: Logger;

const customPrintf = format.printf(({ level, message, label, timestamp }) => {
  const plainMessage = `${timestamp} | ${level.toLowerCase().padEnd(5)} | ${label.padEnd(20)} | ${message}`;
  return colorMessage(level, plainMessage)
});

export const getLogger = (label: string) => {
  if (label.length > 30) {
    throw new Error("Too long label");
  }
  if (!logger) {
    let customFormat = format.json();
    if (process.env.LOG_LOCAL_FORMAT) {
      customFormat = format.combine(format.timestamp(), customPrintf);
    }

    logger = createLogger({
      format: customFormat,
      transports: [new transports.Console()],
      level: "debug"
    });
  }

  return logger.child({ label });
};

const colorMessage = (level: string, message: string): string => {
  if(level === 'INFO' || level === 'info') {
    message = chalk.blue(message);
  } else if(level === 'WARN' || level === 'warn') {
    message = chalk.yellow(message);
  } else if(level === 'ERROR' || level === 'error') {
    message = chalk.red(message);
  } else {
    message = chalk.magenta(message);
  }

  return message;
}
