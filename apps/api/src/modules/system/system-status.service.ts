import type { Database } from '../../db/connection.js'
import {
  findLastSentAt,
  listRecentFailures,
  type NoticeChannelName,
} from '../notifications/notification.repository.js'
import { findLastSuccessfulBackupRun, listRecentBackupRuns } from './backup-run.repository.js'
import type { NoticeChannelStatus, SystemStatus } from './system.schemas.js'

export const RECENT_BACKUP_RUNS_LIMIT = 7
export const RECENT_NOTICE_FAILURES_LIMIT = 5

export type NoticeChannelsConfigured = Record<NoticeChannelName, boolean>

export const NO_NOTICE_CHANNEL: NoticeChannelsConfigured = { push: false, email: false }

const NOTICE_CHANNELS: readonly NoticeChannelName[] = ['push', 'email']

function noticeChannelStatusOf(
  db: Database,
  channel: NoticeChannelName,
  configured: boolean,
): NoticeChannelStatus {
  return {
    channel,
    configured,
    lastSentAt: findLastSentAt(db, channel),
    // A failed row always has finishedAt; the column is nullable only while a send runs.
    recentFailures: listRecentFailures(db, channel, RECENT_NOTICE_FAILURES_LIMIT).flatMap(
      ({ finishedAt, kind, letter, error }) =>
        finishedAt === null ? [] : [{ failedAt: finishedAt, kind, letter, error }],
    ),
  }
}

export function getSystemStatus(
  db: Database,
  noticeChannels: NoticeChannelsConfigured = NO_NOTICE_CHANNEL,
): SystemStatus {
  const recentRuns = listRecentBackupRuns(db, RECENT_BACKUP_RUNS_LIMIT)
  return {
    backup: {
      latestRun: recentRuns[0] ?? null,
      lastSuccessfulRun: findLastSuccessfulBackupRun(db) ?? null,
      recentRuns,
    },
    notices: {
      channels: NOTICE_CHANNELS.map((channel) =>
        noticeChannelStatusOf(db, channel, noticeChannels[channel]),
      ),
    },
  }
}
