'use strict'

// Portable, read-only FFmpeg capability discovery. No OS, GPU or driver is assumed.
// Capability listings are not proof that a real transcode will succeed.
const { spawnSync } = require('child_process')

const BACKENDS = Object.freeze([
  { id: 'software', label: 'Software (CPU)', encoders: ['libx264', 'mpeg2video'], hwaccel: null },
  { id: 'vaapi', label: 'VA-API (Linux)', encoders: ['h264_vaapi'], hwaccel: 'vaapi' },
  { id: 'qsv', label: 'Intel Quick Sync', encoders: ['h264_qsv'], hwaccel: 'qsv' },
  { id: 'nvenc', label: 'NVIDIA NVENC', encoders: ['h264_nvenc'], hwaccel: 'cuda' },
  { id: 'videotoolbox', label: 'Apple VideoToolbox', encoders: ['h264_videotoolbox'], hwaccel: 'videotoolbox' },
  { id: 'amf', label: 'AMD AMF (Windows)', encoders: ['h264_amf'], hwaccel: 'd3d11va' }
])

function runProbe(ffmpegPath, args, runner) {
  const result = runner(ffmpegPath, ['-hide_banner', ...args], {
    encoding: 'utf8', timeout: 4000, maxBuffer: 1024 * 1024, windowsHide: true
  })
  if (result.error || result.status !== 0) return null
  return `${result.stdout || ''}\n${result.stderr || ''}`
}

function parseEncoders(output) {
  if (!output) return new Set()
  const names = new Set()
  output.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*[A-Z.]{6}\s+([A-Za-z0-9_]+)\s/)
    if (match) names.add(match[1])
  })
  return names
}

function parseHwaccels(output) {
  if (!output) return new Set()
  const names = new Set()
  const lines = output.split(/\r?\n/)
  const start = lines.findIndex(line => /Hardware acceleration methods:/i.test(line))
  if (start === -1) return names
  for (const line of lines.slice(start + 1)) {
    const value = line.trim()
    if (!value) continue
    if (!/^[a-z0-9_]+$/i.test(value)) break
    names.add(value)
  }
  return names
}

function inspect(ffmpegPath = 'ffmpeg', runner = spawnSync) {
  // ffmpegPath is configured by the administrator; no shell interpolation occurs.
  const encodersOutput = runProbe(ffmpegPath, ['-encoders'], runner)
  const hwOutput = runProbe(ffmpegPath, ['-hwaccels'], runner)
  const encoders = parseEncoders(encodersOutput)
  const hwaccels = parseHwaccels(hwOutput)
  return {
    ffmpegAvailable: encodersOutput !== null && hwOutput !== null,
    // A listed codec is only compiled in; runtime GPU access still requires validation.
    backends: BACKENDS.map(backend => ({
      id: backend.id,
      label: backend.label,
      encoders: backend.encoders.filter(name => encoders.has(name)),
      hwaccelListed: backend.hwaccel ? hwaccels.has(backend.hwaccel) : null,
      usable: null,
      note: 'Not tested against hardware; only FFmpeg capabilities were inspected.'
    }))
  }
}

module.exports = { BACKENDS, inspect, parseEncoders, parseHwaccels }
