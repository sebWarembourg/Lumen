import { NextResponse } from 'next/server'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'

export const dynamic = 'force-dynamic'

/**
 * Resolve a friendly display name for the OS user.
 * Strategy:
 *   1. On macOS: `dscl . -read /Users/<uid> RealName` — gives the full name set
 *      in System Settings (e.g. "Sebastien Warembourg").
 *   2. Fallback: `os.userInfo().username` (login name), prettified.
 *   3. Last resort: basename of `$HOME`.
 */
function resolveUserName(): { name: string; username: string } {
  const username = os.userInfo().username
  const homeBasename = path.basename(os.homedir())

  // Try macOS Directory Service first.
  if (process.platform === 'darwin') {
    try {
      const out = execSync(`dscl . -read /Users/${username} RealName`, {
        encoding: 'utf8',
        timeout: 1500,
      })
      // Output format:
      //   RealName:
      //    Sebastien Warembourg
      // or a single line: "RealName: Sebastien Warembourg"
      const lines = out.split('\n').map(l => l.trim()).filter(Boolean)
      let real: string | undefined
      if (lines.length >= 2 && lines[0].startsWith('RealName')) {
        real = lines.slice(1).join(' ').trim()
      } else if (lines[0]?.startsWith('RealName:')) {
        real = lines[0].slice('RealName:'.length).trim()
      }
      if (real && real.length > 0) return { name: real, username }
    } catch {
      // ignore — fall through
    }
  }

  // Fallback: prettify the login name (capitalize first letter of each segment).
  const fallback = (username || homeBasename || 'User')
    .split(/[._-]/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ') || 'User'

  return { name: fallback, username }
}

export async function GET() {
  const user = resolveUserName()
  return NextResponse.json(user)
}
