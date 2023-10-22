export class CronLock {
  private jobQueue: Array<{ id: string; jobFunction: () => Promise<any> }> = [];
  private isCronRunning = false;

  public async addToQueue(jobId: string, chainId: number, jobFunction: () => Promise<any>) {
    if (!this.jobQueue.find((job) => job.id === jobId)) {
      this.jobQueue.push({ id: jobId, jobFunction });
    }
    this.runJobsSequentially(chainId);
  }

  private async runJobsSequentially(chainId: number) {
    if (!this.isCronRunning && this.jobQueue.length > 0) {
      this.isCronRunning = true;
      const { id, jobFunction } = this.jobQueue.shift()!;
      try {
        await jobFunction();
      } catch (error) {
        console.error(`Error in job ${id}: `, error);
      } finally {
        this.isCronRunning = false;
        this.runJobsSequentially(chainId);
      }
    }
  }
}

export const cronLock = new CronLock();
