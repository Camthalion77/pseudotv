'use strict'
const assert = require('assert')
const hw = require('../src/hardwareAcceleration')

const encoders = `Encoders:\n V..... = Video\n V....D h264_nvenc NVIDIA NVENC\n V..... h264_vaapi VAAPI\n V..... libx264 H.264 software\n`
const methods = 'Hardware acceleration methods:\nvaapi\ncuda\n'
assert(hw.parseEncoders(encoders).has('h264_nvenc'))
assert(hw.parseEncoders(encoders).has('h264_vaapi'))
assert(!hw.parseEncoders(encoders).has('h264_qsv'))
assert(hw.parseHwaccels(methods).has('cuda'))
assert(!hw.parseHwaccels(methods).has('qsv'))
const mock = (_exe, args, options) => {
  assert.strictEqual(options.windowsHide, true)
  return { status: 0, stdout: args.includes('-encoders') ? encoders : methods, stderr: '' }
}
const result = hw.inspect('fake-ffmpeg', mock)
assert.strictEqual(result.ffmpegAvailable, true)
assert.strictEqual(result.backends.find(b => b.id === 'nvenc').hwaccelListed, true)
assert.deepStrictEqual(result.backends.find(b => b.id === 'qsv').encoders, [])
assert.strictEqual(result.backends.find(b => b.id === 'nvenc').usable, null)
assert.strictEqual(hw.inspect('missing', () => ({ status: null, error: new Error('missing') })).ffmpegAvailable, false)
console.log('Portable FFmpeg capability tests passed')
