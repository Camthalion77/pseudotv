const assert = require('assert')
const {apply,norm} = require('../src/languageSelection')
const streams=[{streamType:1,index:0},{streamType:2,index:1,languageCode:'eng',default:true},
    {streamType:2,index:2,languageCode:'ell'},{streamType:3,index:3,languageCode:'eng'},
    {streamType:3,index:4,languageCode:'gre'}]
const item={type:'movie', opts:{audioIndex:'-1',subtitleIndex:'-2'}, streams}
const settings={enabled:true,audio:'el',subtitles:'ell',fallback:'en',forced:true}
assert.equal(norm('gre'),'ell')
assert.deepEqual([apply(item,settings).opts.audioIndex,apply(item,settings).opts.subtitleIndex],['2','4'])
assert.equal(item.opts.subtitleIndex,'-2','must not mutate stored program')
assert.equal(apply(item,{...settings,enabled:false}),item)
assert.equal(apply({...item,opts:{...item.opts,languageOverride:true}},settings).opts.subtitleIndex,'-2')
assert.equal(apply(item,{...settings,subtitles:'off'}).opts.subtitleIndex,'-2')
assert.equal(apply({...item,streams:streams.slice(0,4)},settings).opts.subtitleIndex,'3')
// Global defaults must clear old manual track choices.
const legacy = {...item, opts: {...item.opts, audioIndex: '2', subtitleIndex: '4'}}
const defaults = apply(legacy, {...settings, audio:'default', subtitles:'default'})
assert.equal(defaults.opts.audioIndex, '-1')
assert.equal(defaults.opts.subtitleIndex, '-1')
assert.equal(legacy.opts.audioIndex, '2', 'legacy settings must not be mutated')
assert.equal(legacy.opts.subtitleIndex, '4', 'legacy settings must not be mutated')
// Explicit new override must preserve manual selections.
const exception = apply({...legacy, opts:{...legacy.opts, languageOverride:true}}, settings)
assert.equal(exception.opts.audioIndex, '2')
assert.equal(exception.opts.subtitleIndex, '4')
console.log('Global languages tests: PASS')
