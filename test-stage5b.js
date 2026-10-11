'use strict'
const fs=require('fs'), assert=require('assert')
const code=fs.readFileSync('src/ffmpeg.js','utf8')
const {assessPlayback}=require('./src/hardwareRuntime')
assert(code.includes("require('./hardwareRuntime')"))
assert(code.includes('const hardwareAssessment = assessPlayback('))
assert(code.includes('this.ffmpeg = spawn(this.ffmpegPath, tmpargs)'))
assert(code.indexOf('assessPlayback({') < code.indexOf('this.ffmpeg = spawn(this.ffmpegPath, tmpargs)'))
for (const mode of ['auto','nvenc','vaapi','qsv','videotoolbox','amf']) {
 const a=assessPlayback({mode,results:{nvenc:true,vaapi:true,qsv:true,videotoolbox:true,amf:true},args:['-filter_complex','[0:v]null[v]']})
 assert.strictEqual(a.ready,false)
 assert.strictEqual(a.playbackUnchanged,true)
}
console.log('Stage 5B playback preflight integration tests passed')
