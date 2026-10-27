import "server-only"
import { spawn } from "node:child_process"
import path from "node:path"

// The Python tools in ../skills are the source of truth. The web app pipes
// text into them on stdin and reads their --json output, so a fix to a script
// shows up here without touching this code.
const SKILLS_DIR = process.env.SKILLS_DIR ?? path.resolve(process.cwd(), "..", "skills")
const PYTHON = process.env.PYTHON_BIN ?? "python3"
const TIMEOUT_MS = 15_000
const MAX_OUTPUT = 2_000_000

export const SCRIPTS = {
  hookscore: "ig-reel/hookscore.py",
  beats: "ig-reel/beats.py",
  caption: "ig-caption/caption.py",
  humanize: "ig-human/humanize.py",
  detect: "ig-human/detect.py",
} as const

export async function runTool(script: keyof typeof SCRIPTS, args: string[], stdin: string): Promise<unknown> {
  const file = path.join(SKILLS_DIR, SCRIPTS[script])
  return new Promise((resolve, reject) => {
    // -I: isolated mode, so nothing in the working directory can shadow a module.
    const child = spawn(PYTHON, ["-I", file, "-", "--json", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      // Only what Python needs: the app's secrets stay out of the child process.
      env: { NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH ?? "", PYTHONIOENCODING: "utf-8" },
    })
    let out = ""
    let err = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error(`${script} timed out`))
    }, TIMEOUT_MS)

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      out += chunk
      if (out.length > MAX_OUTPUT) child.kill("SIGKILL")
    })
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (err += chunk))
    child.on("error", (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      // Exit 1 is a verdict ("this did not pass"), not a crash: the scripts
      // still print their full JSON. Anything else is a real failure.
      if (code !== 0 && code !== 1) return reject(new Error(err.trim() || `${script} exited with ${code}`))
      try {
        resolve(JSON.parse(out))
      } catch {
        reject(new Error(`${script} returned something that is not JSON`))
      }
    })
    child.stdin.end(stdin, "utf8")
  })
}
