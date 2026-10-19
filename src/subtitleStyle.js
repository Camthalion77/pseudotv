const fs = require('fs')

// FFmpeg converts MOV_TEXT/SRT/ASS to ASS. Normalize the ASS canvas and
// all style rows before libass renders it, avoiding enormous source font sizes.
function restyle(text, options = {}) {
    const size = Number.isInteger(options.subtitleFontSize) && options.subtitleFontSize >= 16 && options.subtitleFontSize <= 48
        ? options.subtitleFontSize : 26
    const margin = Number.isInteger(options.subtitleMargin) && options.subtitleMargin >= 8 && options.subtitleMargin <= 80
        ? options.subtitleMargin : 28
    let section = ''
    let fields = null
    let foundStyles = false
    let hasX = false
    let hasY = false
    const lines = text.split(/\r?\n/).map(line => {
        const m = line.match(/^\s*\[([^\]]+)\]\s*$/)
        if (m) { section = m[1].toLowerCase(); fields = null; return line }
        if (section === 'script info') {
            if (/^PlayResX\s*:/i.test(line)) { hasX = true; return 'PlayResX: 1280' }
            if (/^PlayResY\s*:/i.test(line)) { hasY = true; return 'PlayResY: 720' }
        }
        if (section === 'v4+ styles' || section === 'v4 styles') {
            if (/^Format\s*:/i.test(line)) {
                fields = line.substring(line.indexOf(':') + 1).split(',').map(x => x.trim().toLowerCase())
                return line
            }
            if (/^Style\s*:/i.test(line) && fields) {
                foundStyles = true
                const values = line.substring(line.indexOf(':') + 1).split(',').map(x => x.trim())
                const set = (name, value) => { const i = fields.indexOf(name); if (i >= 0 && i < values.length) values[i] = String(value) }
                set('fontname', 'DejaVu Sans')
                set('fontsize', size)
                set('outline', 2)
                set('shadow', 1)
                set('alignment', 2)
                set('marginv', margin)
                return 'Style: ' + values.join(',')
            }
        }
        if (section === 'events' && /^Dialogue\s*:/i.test(line)) {
            // Remove embedded font-size/scale overrides from the input; keep text and timing.
            return line.replace(/\\fs(?:\d+(?:\.\d+)?)/gi, '').replace(/\\fsc[xy](?:\d+(?:\.\d+)?)/gi, '')
        }
        return line
    })
    if (!foundStyles) throw new Error('ASS styles section missing; cannot normalize subtitles')
    // Insert missing PlayRes fields inside Script Info, without altering existing video dimensions.
    const info = lines.findIndex(line => /^\s*\[Script Info\]\s*$/i.test(line))
    if (info >= 0) {
        if (!hasX) lines.splice(info + 1, 0, 'PlayResX: 1280')
        if (!hasY) lines.splice(info + 1, 0, 'PlayResY: 720')
    }
    return lines.join('\n')
}
function normalizeAss(path, options) {
    const original = fs.readFileSync(path, 'utf8')
    const styled = restyle(original, options)
    fs.writeFileSync(path, styled, 'utf8')
}
module.exports = { restyle, normalizeAss }
