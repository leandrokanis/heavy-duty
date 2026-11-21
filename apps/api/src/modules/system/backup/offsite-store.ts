export type BackupTrigger = 'scheduled' | 'manual'

export type OffsiteStore = {
  send(snapshotPath: string, trigger: BackupTrigger): Promise<void>
}

// detail is the tool's own last error line; the job removes secrets before storing it.
export class OffsiteCopyError extends Error {
  constructor(readonly detail: string) {
    super(detail)
    this.name = 'OffsiteCopyError'
  }
}
