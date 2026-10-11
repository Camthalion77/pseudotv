'use strict'
const assert=require('assert')
const { argsFor,probePipeline }=require('./src/pipelineProbe')
for (const backend of ['software','qsv','nvenc','videotoolbox','amf']) {
 const args=argsFor(backend)
 assert(args.includes('-filter_complex'))
 assert(args.includes('mpegts'))
 assert(args.includes('-c:v'))
 assert(!args.includes('INPUTFILE'))
}
assert.strictEqual(argsFor('vaapi'),null)
assert(argsFor('vaapi',{vaapiDevice:'/example/render-device'}).includes('/example/render-device'))
assert.throws(()=>argsFor('bad'))
const ok=probePipeline('ffmpeg','software',{},()=>({status:0}))
assert.strictEqual(ok.supported,true)
const bad=probePipeline('ffmpeg','qsv',{},()=>({status:1}))
assert.strictEqual(bad.supported,false)
console.log('Stage 5C synthetic pipeline unit tests passed')
