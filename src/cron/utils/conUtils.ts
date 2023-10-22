import { ScheduledTask } from "node-cron";
import { Logger } from "winston";

class CronJob {
  public readonly jobName: string;
  public isCronRunning: boolean;
  public cronJob: ScheduledTask | undefined;
  public log: Logger;
  public process: NodeJS.Process;

  constructor(jobName, process, log: Logger) {
    this.jobName = jobName;
    this.process = process;
    this.isCronRunning = false;
    this.log = log;
  }

  public stopCronJob = (): void => {
    if (this.cronJob) this.cronJob.stop();
  };

  public handleExit = (): void => {
    this.stopCronJob();
    this.log.info(`Stopping ${this.jobName} cron job and closing server...`);
    this.process.exit(0);
  };

  public handleError = (err: Error): void => {
    this.stopCronJob();
    this.log.error(`Unhandled error: ${err.message}`);
    this.process.exit(1);
  };

  public initialize = (): void => {
    this.process.on("unhandledRejection", this.handleError);
    this.process.on("uncaughtException", this.handleError);
    this.process.on("SIGINT", this.handleExit);
    this.process.on("SIGTERM", this.handleExit);
  };
}

export default CronJob;
