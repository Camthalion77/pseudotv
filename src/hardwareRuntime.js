'use strict'

const { selectBackend } = require('./hardwarePolicy')

// Inspect the actual playback arguments; never mutate the user's custom FFmpeg template.
function assessPlayback(options = {}) {
  const args = Array.isArray(options.args) ? options.args : []
  const mode = options.mode || 'off'
  const flags = options.filters || {}
  const filterGraph = args.includes('-filter_complex') || args.includes('-vf') || args.includes('-filter:v')
  const cpuFilters = Boolean(filterGraph || flags.subtitleBurnIn || flags.iconOverlay || flags.deinterlace)
  const selection = selectBackend({mode, results: options.results || {},
    filters: {subtitleBurnIn: cpuFilters}})
  // Existing filter_complex always outputs software frames. The basic encoder
  // smoke test is not sufficient to guarantee a valid end-to-end pipeline.
  // This module is a preflight, not an unsafe encoder swap.
  const ready = selection.backend !== 'software' && !cpuFilters
  return {ready, selected: ready ? selection.backend : 'software',
    encoder: ready ? selection.encoder : 'libx264',
    reason: cpuFilters ? 'Playback uses CPU filter graph; GPU pipeline must be validated end-to-end' : selection.reason,
    playbackUnchanged: true}
}

module.exports = { assessPlayback }
