'use strict'
const assert = require('assert')
const hw = require('./src/hardwareAcceleration')
const good = () => ({ status: 0, stdout: '', stderr: '' })
const bad = () => ({ status: 1, stdout: '', stderr: 'No GPU device' })
assert.strictEqual(hw.testEncoder('/bin/ffmpeg', 'software', good).supported, true)
assert.strictEqual(hw.testEncoder('/bin/ffmpeg', 'vaapi', bad).supported, false)
assert.strictEqual(hw.testEncoder('/bin/ffmpeg', 'invalid', good).supported, false)
let args
hw.testEncoder('ffmpeg', 'nvenc', (_, a) => { args = a; return good() })
assert(args.includes('h264_nvenc'))
assert(!args.join(' ').includes('Plex'))
console.log('Stage 2 smoke-test unit tests passed')
