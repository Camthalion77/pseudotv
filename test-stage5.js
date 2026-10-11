'use strict'
const assert = require('assert')
const {assessPlayback}=require('./src/hardwareRuntime')
const good={mode:'nvenc',results:{nvenc:true}}
assert.equal(assessPlayback({...good,args:['-filter_complex','[v]null']}).ready,false)
assert.equal(assessPlayback({...good,args:['-map','0:v']}).ready,true)
assert.equal(assessPlayback({...good,args:['-map','0:v'],filters:{subtitleBurnIn:true}}).ready,false)
assert.equal(assessPlayback({mode:'off',args:[]}).selected,'software')
assert.equal(assessPlayback({mode:'qsv',results:{qsv:false}}).ready,false)
console.log('Stage 5A FFmpeg pipeline safety tests passed')
