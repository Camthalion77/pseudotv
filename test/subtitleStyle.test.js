const assert = require('assert')
const { restyle } = require('../src/subtitleStyle')
const original = `[Script Info]
PlayResX: 1920
PlayResY: 1080
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, Outline, Shadow, Alignment, MarginV
Style: Default,Arial,95,&H00FFFFFF,0,0,9,4
[Events]
Format: Layer, Start, End, Style, Text
Dialogue: 0,0:00:00.00,0:00:02.00,Default,{\\fs130}Γεια σου!
`
const result = restyle(original, {subtitleFontSize:26,subtitleMargin:28})
assert(result.includes('PlayResX: 1280'))
assert(result.includes('PlayResY: 720'))
assert(result.includes('Style: Default,DejaVu Sans,26,&H00FFFFFF,2,1,2,28'))
assert(!result.includes('fs130'))
assert(result.includes('Γεια σου!'))
assert(!result.includes('Arial,95'))
console.log('Subtitle style tests: PASS')
