// Global audio/subtitle selection for all existing and new channels.
// Returns a shallow copy: never mutates stored schedules or Plex metadata.
const aliases = { el:'ell', gre:'ell', ell:'ell', en:'eng', eng:'eng', de:'deu', ger:'deu', deu:'deu',
    fr:'fra', fre:'fra', fra:'fra', es:'spa', spa:'spa', it:'ita', ita:'ita', pt:'por', por:'por',
    ja:'jpn', jpn:'jpn', zh:'zho', chi:'zho', zho:'zho', ru:'rus', rus:'rus' }
function norm(value) {
    if (!value || typeof value !== 'string') return ''
    const code = value.trim().toLowerCase().replace('_','-').split('-')[0]
    return aliases[code] || code
}
function lang(stream) { return norm(stream.languageCode || stream.languageTag || stream.language) }
function find(streams, type, preferred, forcedOnly) {
    const wanted = norm(preferred)
    const matches = streams.map((stream, index) => ({stream,index})).filter(x =>
        x.stream && x.stream.streamType === type && lang(x.stream) === wanted &&
        (!forcedOnly || x.stream.forced))
    if (!matches.length) return -1
    const pick = matches.find(x => x.stream.selected || x.stream.default) || matches[0]
    return pick.index // Plex array index is the FFmpeg stream index in current templates.
}
function apply(item, globalSettings) {
    if (!item || !item.streams || !item.opts || !globalSettings || !globalSettings.enabled ||
        item.type === 'commercial') return item
    // An explicit newly-created override takes precedence over global settings.
    if (item.opts.languageOverride === true) return item
    const opts = Object.assign({}, item.opts)
    const streams = item.streams
    // Global settings override legacy per-program choices even in 'default' mode.
    if (globalSettings.audio === 'default') {
        opts.audioIndex = '-1'
    } else {
        const a = find(streams, 2, globalSettings.audio, false)
        opts.audioIndex = a >= 0 ? String(a) : '-1'
    }
    if (globalSettings.subtitles === 'off') {
        opts.subtitleIndex = '-2'
    } else if (globalSettings.subtitles === 'default') {
        opts.subtitleIndex = '-1'
    } else {
        let index = find(streams,3,globalSettings.subtitles,false)
        if (index < 0 && globalSettings.fallback !== 'off' && globalSettings.fallback !== 'default')
            index = find(streams,3,globalSettings.fallback,false)
        if (index < 0 && globalSettings.forced) {
            const forced = streams.findIndex(s => s && s.streamType === 3 && s.forced)
            if (forced >= 0) index = forced
        }
        opts.subtitleIndex = index >= 0 ? String(index) : '-2'
    }
    return Object.assign({}, item, {opts})
}
module.exports = {apply, norm, find}
