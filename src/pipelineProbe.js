'use strict'
// Offline end-to-end GPU encode check, deliberately not wired to live playback.
const { spawnSync } = require('child_process')
const ENCODERS = Object.freeze({
  software: 'libx264', qsv: 'h264_qsv', nvenc: 'h264_nvenc',
  videotoolbox: 'h264_videotoolbox', amf: 'h264_amf', vaapi: 'h264_vaapi'
})
function argsFor(backend, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(ENCODERS, backend)) throw Error('Unknown backend')
  const base = ['-hide_banner','-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=12:duration=1']
  const filter = backend === 'vaapi' ? '[0:v]null,format=nv12,hwupload[v]' : '[0:v]null[v]'
  if (backend === 'vaapi') {
    // VA-API requires a caller-supplied render device; do not hardcode /dev/dri.
    if (!options.vaapiDevice) return null
    base.unshift('-vaapi_device', options.vaapiDevice)
  }
  return [...base,'-filter_complex',filter,'-map','[v]','-frames:v','12','-c:v',ENCODERS[backend],
    '-f','mpegts','-y',process.platform === 'win32' ? 'NUL' : '/dev/null']
}
function probePipeline(ffmpegPath, backend, options = {}, runner = spawnSync) {
  const args = argsFor(backend, options)
  if (!args) return {backend, supported:false, reason:'No VA-API render device configured'}
  const result = runner(ffmpegPath || 'ffmpeg',args,{encoding:'utf8',timeout:15000,maxBuffer:131072,windowsHide:true})
  return {backend,supported: !result.error && result.status === 0,
    reason: result.error ? String(result.error.message).slice(0,400) : result.status===0 ? 'Synthetic filter-to-MPEG-TS test passed' : 'Synthetic pipeline failed'}
}
module.exports = { ENCODERS, argsFor, probePipeline }
