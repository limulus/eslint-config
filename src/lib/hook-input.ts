/** Reads the whole of stdin. Injectable so tests never touch the real process stream. */
export type StdinReader = () => Promise<string>

interface HookPayload {
  tool_input?: { file_path?: unknown }
}

/**
 * The file to format: the first positional argument, else `tool_input.file_path` from a Claude
 * Code hook payload on stdin. Returns null when neither yields a path — the caller decides
 * whether that is an error or a no-op.
 *
 * Argv wins outright, and stdin is not read at all in that case, so the bin stays usable as a
 * plain `limulus-format <file>` outside any hook.
 */
export async function resolveTargetFile(
  args: readonly string[],
  readStdin: StdinReader
): Promise<string | null> {
  const [fromArgv] = args
  if (fromArgv) return fromArgv

  const raw = await readStdin()
  if (!raw.trim()) return null

  let payload: HookPayload
  try {
    payload = JSON.parse(raw) as HookPayload
  } catch {
    return null
  }

  const filePath = payload.tool_input?.file_path
  return typeof filePath === 'string' && filePath ? filePath : null
}
