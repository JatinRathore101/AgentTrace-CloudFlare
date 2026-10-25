import winston from "winston";

const { combine, colorize, printf, timestamp } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts }) => {
  return `${ts} [${level}] ${message}`;
});

const logger = winston.createLogger({
  level: "debug",
  format: combine(
    timestamp({ format: "HH:mm:ss" }),
    colorize({ all: true }),
    logFormat,
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
