import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4
};

class Logger {
  constructor() {
    this.logLevel = process.env.SYNC_LOG_LEVEL || 'info';
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.ensureLogsDir();
    this.logFile = path.join(this.logsDir, `sync-${new Date().toISOString().split('T')[0]}.log`);
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  writeToFile(message) {
    fs.appendFileSync(this.logFile, message + '\n');
  }

  error(message, meta = {}) {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', message, meta);
    console.error(chalk.red(formatted));
    this.writeToFile(formatted);
  }

  warn(message, meta = {}) {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(chalk.yellow(formatted));
    this.writeToFile(formatted);
  }

  info(message, meta = {}) {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', message, meta);
    console.log(chalk.blue(formatted));
    this.writeToFile(formatted);
  }

  success(message, meta = {}) {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('success', message, meta);
    console.log(chalk.green(formatted));
    this.writeToFile(formatted);
  }

  debug(message, meta = {}) {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', message, meta);
    console.log(chalk.gray(formatted));
    this.writeToFile(formatted);
  }

  verbose(message, meta = {}) {
    if (!this.shouldLog('verbose')) return;
    const formatted = this.formatMessage('verbose', message, meta);
    console.log(chalk.cyan(formatted));
    this.writeToFile(formatted);
  }

  progressBar(current, total, width = 30) {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((width * percent) / 100);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    process.stdout.write(`\r${chalk.cyan(bar)} ${percent}%`);
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  summary(syncResult) {
    console.log('\n' + chalk.cyan('═'.repeat(50)));
    console.log(chalk.cyan('SYNC SUMMARY'));
    console.log(chalk.cyan('═'.repeat(50)));
    console.log(`  ${chalk.green('✓')} Journeys Synced: ${syncResult.synced}`);
    console.log(`  ${chalk.yellow('⚠')} Conflicts: ${syncResult.conflicts}`);
    console.log(`  ${chalk.red('✗')} Failed: ${syncResult.failed}`);
    console.log(`  ${chalk.blue('→')} Created: ${syncResult.created}`);
    console.log(`  ${chalk.blue('↻')} Updated: ${syncResult.updated}`);
    console.log(`  ${chalk.cyan('⏱')} Duration: ${syncResult.duration}ms`);
    console.log(chalk.cyan('═'.repeat(50)) + '\n');
  }
}

export const logger = new Logger();
export default logger;
