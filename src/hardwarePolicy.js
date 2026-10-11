'use strict'

// Cross-platform encoder selection policy. No device paths, OS assumptions or
// Plex-specific behavior. The caller must supply real smoke-test results.
const ORDER = Object.freeze(['videotoolbox', 'qsv', 'nvenc', 'vaapi', 'amf'])
const ENCODER = Object.freeze({
  software: 'libx264', videotoolbox: 'h264_videotoolbox',
  qsv: 'h264_qsv', nvenc: 'h264_nvenc',
  vaapi: 'h264_vaapi', amf: 'h264_amf'
})

function selectBackend(options = {}) {
  const mode = options.mode || 'off'
  const results = options.results || {}
  const filters = options.filters || {}
  const fallback = { backend: 'software', encoder: ENCODER.software, reason: 'software fallback' }
  if (mode === 'off') return { ...fallback, reason: 'hardware acceleration disabled' }
  // Existing PseudoTV subtitle rendering, deinterlacing and overlays are CPU-side.
  // Hardware paths require explicit per-backend filter compatibility testing.
  if (filters.subtitleBurnIn || filters.iconOverlay || filters.deinterlace) {
    return { ...fallback, reason: 'CPU video filters require software path' }
  }
  const candidates = mode === 'auto' ? ORDER : [mode]
  for (const backend of candidates) {
    if (Object.prototype.hasOwnProperty.call(ENCODER, backend) && backend !== 'software' && results[backend] === true) {
      return { backend, encoder: ENCODER[backend], reason: 'verified encoder smoke test' }
    }
  }
  return { ...fallback, reason: 'no verified hardware encoder' }
}
module.exports = { selectBackend, ORDER, ENCODER }
