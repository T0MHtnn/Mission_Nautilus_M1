import winston from 'winston';
import 'winston-daily-rotate-file';

// Format commun pour les logs
const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

// Configuration pour les événements métier (zanzibar-api.log)
const eventLogger = winston.createLogger({
	format: logFormat,
	transports: [
		new winston.transports.DailyRotateFile({
			filename: 'log/zanzibar-api-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			maxFiles: '14d' // Garde 14 jours de logs
		}),
		new winston.transports.Console() // Affiche aussi dans la console pour le dev
	]
});

// Configuration pour les accès (access-zanzibar-api.log)
const accessLogger = winston.createLogger({
	format: logFormat,
	transports: [
		new winston.transports.DailyRotateFile({
			filename: 'log/access-zanzibar-api-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			maxFiles: '14d'
		})
	]
});

export { eventLogger, accessLogger };