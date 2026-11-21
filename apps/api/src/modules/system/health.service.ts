export type DatabaseHealthProbe = () => boolean

export type SystemHealth =
  | { status: 'ok'; database: 'up' }
  | { status: 'unavailable'; database: 'down' }

export function getSystemHealth(databaseHealth: DatabaseHealthProbe): SystemHealth {
  return isDatabaseUp(databaseHealth)
    ? { status: 'ok', database: 'up' }
    : { status: 'unavailable', database: 'down' }
}

function isDatabaseUp(databaseHealth: DatabaseHealthProbe): boolean {
  try {
    return databaseHealth()
  } catch (error) {
    console.error('Database health probe failed:', error)
    return false
  }
}
