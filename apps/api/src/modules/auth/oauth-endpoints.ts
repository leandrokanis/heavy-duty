export const MCP_RESOURCE_PATH = '/mcp'
export const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource'
export const AUTHORIZATION_SERVER_METADATA_PATH = '/.well-known/oauth-authorization-server'
export const AUTHORIZATION_SCREEN_PATH = '/autorizar'
export const REGISTER_PATH = '/api/oauth/register'
export const TOKEN_PATH = '/api/oauth/token'
export const AUTHORIZATION_PATH = '/api/oauth/authorization'

// Every OAuth URL is built from APP_ORIGIN, never from the Host header, see ADR-020.
export function mcpResourceOf(appOrigin: string): string {
  return `${appOrigin}${MCP_RESOURCE_PATH}`
}

export function resourceMetadataUrlOf(appOrigin: string): string {
  return `${appOrigin}${PROTECTED_RESOURCE_METADATA_PATH}${MCP_RESOURCE_PATH}`
}
