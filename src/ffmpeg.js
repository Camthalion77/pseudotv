const spawn = require('child_process').spawn
const events = require('events')
const fs = require('fs')
const { assessPlayback } = require('./hardwareRuntime')

class FFMPEG extends events.EventEmitter {
    constructor(opts, channel) {
        super()
        this.offset = 0
        this.args = []
        this.opts = opts
        this.channel = channel
        this.ffmpegPath = opts.ffmpegPath
        let lines = opts.args.split('\n')
        for (let i = 0, l = lines.length; i < l; i++) {
            let x = lines[i].indexOf(' ')
            if (x === -1)
                this.args.push(lines[i])
            else {
                this.args.push(lines[i].substring(0, x))
                this.args.push(lines[i].substring(x + 1, lines[i].length))
            }
        }
    }
    // This is used to generate ass subtitles from text subs to be used with the ass filter in ffmpeg.
    createSubsFromStream(file, startTime, duration, streamIndex, output) {
        if (process.env.DEBUG) console.log('Generating .ass subtitles')
        let exe = spawn(this.ffmpegPath, [
            '-threads', this.opts.threads,
            '-ss', startTime,
            '-i', file,
            '-t', duration,
            '-map', `0:${streamIndex}`,
            '-f', 'ass',
            output
        ])
        return new Promise((resolve, reject) => {
            if (this.opts.logFfmpeg) {
                exe.stderr.on('data', (chunk) => {
                    process.stderr.write(chunk)
                })
            }
            exe.on('close', (code) => {
                if (code === 0) {
                    if (process.env.DEBUG) console.log('Successfully generated .ass subtitles')
                    resolve()
                } else {
                    console.log('Failed generating .ass subtitles.')
                    reject()
                }
            })
        })
    }
    async spawn(lineupItem) {
        let videoIndex = lineupItem.opts.videoIndex
        let audioIndex = lineupItem.opts.audioIndex
        let subtitleIndex = lineupItem.opts.subtitleIndex
        let uniqSubFileName = Date.now().valueOf().toString()

        for (let i = 0, l = lineupItem.streams.length; i < l; i++) {
            if (videoIndex === '-1' && lineupItem.streams[i].streamType === 1)
                if (lineupItem.streams[i].default)
                    videoIndex = i
            if (audioIndex === '-1' && lineupItem.streams[i].streamType === 2)
                if (lineupItem.streams[i].default || lineupItem.streams[i].selected)
                    audioIndex = i
            if (subtitleIndex === '-1' && lineupItem.streams[i].streamType === 3)
                if (lineupItem.streams[i].default || lineupItem.streams[i].forced)
                    subtitleIndex = i
        }

        // if for some reason we didn't find a default track, let ffmpeg decide..
        if (videoIndex === '-1')
            videoIndex = 'v'
        if (audioIndex === '-1')
            audioIndex = 'a'

        let sub = (subtitleIndex === '-1' || subtitleIndex === '-2') ? null : lineupItem.streams[subtitleIndex]

        let tmpargs = JSON.parse(JSON.stringify(this.args))
        let startTime = tmpargs.indexOf('STARTTIME')
        let dur = tmpargs.indexOf('DURATION')
        let input = tmpargs.indexOf('INPUTFILE')
        let vidStream = tmpargs.indexOf('VIDEOSTREAM')
        let output = tmpargs.indexOf('OUTPUTFILE')
        let tsoffset = tmpargs.indexOf('TSOFFSET')
        let audStream = tmpargs.indexOf('AUDIOSTREAM')
        let chanName = tmpargs.indexOf('CHANNELNAME')

        tmpargs[startTime] = lineupItem.start / 1000
        tmpargs[dur] = lineupItem.duration / 1000
        tmpargs[input] = lineupItem.file
        tmpargs[audStream] = `0:${audioIndex}`
        tmpargs[chanName] = `service_name="${this.channel.name}"`
        tmpargs[tsoffset] = this.offset
        tmpargs[output] = 'pipe:1'

        let iconOverlay = `[0:${videoIndex}]null`
        let deinterlace = 'null'
        let posAry = [ '20:20', 'W-w-20:20', '20:H-h-20', 'W-w-20:H-h-20'] // top-left, top-right, bottom-left, bottom-right (with 20px padding)
        let icnDur = ''
        if (this.channel.iconDuration > 0)
            icnDur = `:enable='between(t,0,${this.channel.iconDuration})'`
        if (this.channel.icon !== '' && this.channel.overlayIcon && lineupItem.type === 'program') {
            iconOverlay = `[1:v]scale=${this.channel.iconWidth}:-1[icn];[0:${videoIndex}][icn]overlay=${posAry[this.channel.iconPosition]}${icnDur}`
            if (process.env.DEBUG) console.log('Channel Icon Overlay Enabled')
        }

        if (videoIndex !== 'v') {
            if (typeof lineupItem.streams[videoIndex].scanType === 'undefined' || lineupItem.streams[videoIndex].scanType !== 'progressive') {
                deinterlace = 'yadif'
                if (process.env.DEBUG) console.log('Deinterlacing Video')
            }
        }

        if (sub === null || lineupItem.type === 'commercial') { // No subs or icon overlays for Commercials
            tmpargs[vidStream] = '[v]'
            tmpargs.splice(vidStream - 1, 0, "-filter_complex", `${iconOverlay}[v1];[v1]${deinterlace}[v]`)
            console.log("No Subtitles")
        } else if (sub.codec === 'pgs') { // If program has PGS subs
            tmpargs[vidStream] = '[v]'
            if (typeof sub.index === 'undefined') { // If external subs
                console.log("PGS SUBS (external) - Not implemented..")
                tmpargs.splice(vidStream - 1, 0, "-filter_complex", `${iconOverlay}[v1];[v1]${deinterlace}[v]`)
            } else {                    // Otherwise, internal/embeded pgs subs
                console.log("PGS SUBS (embeded)")
                tmpargs.splice(vidStream - 1, 0, "-filter_complex", `${iconOverlay}[v2];[v2]${deinterlace}[v1];[v1][0:${sub.index}]overlay[v]`)
            }
        } else if (sub.codec === 'srt' || sub.codec === 'ass') {
            tmpargs[vidStream] = '[v]'
            if (typeof sub.index === 'undefined') {
                console.log("SRT SUBS (external)")
                await this.createSubsFromStream(sub.key, lineupItem.start / 1000, lineupItem.duration / 1000, 0, `${process.env.DATABASE}/${uniqSubFileName}.ass`)
                tmpargs.splice(vidStream - 1, 0, "-filter_complex", `${iconOverlay}[v1];[v1]${deinterlace},ass=${process.env.DATABASE}/${uniqSubFileName}.ass[v]`)
            } else {
                console.log("SRT SUBS (embeded) - This may take a few seconds..")
                await this.createSubsFromStream(lineupItem.file, lineupItem.start / 1000, lineupItem.duration / 1000, sub.index, `${process.env.DATABASE}/${uniqSubFileName}.ass`)
                tmpargs.splice(vidStream - 1, 0, "-filter_complex", `${iconOverlay}[v1];[v1]${deinterlace},ass=${process.env.DATABASE}/${uniqSubFileName}.ass[v]`)
            }
        } else { // Can't do VobSub's as plex only hosts the .idx file, there is no access to the .sub file.. Who the fuck uses VobSubs anyways.. SRT/ASS FTW
            tmpargs[vidStream] = '[v]'
            tmpargs.splice(vidStream - 1, 0, "-filter_complex", `${iconOverlay}[v1];[v1]${deinterlace}[v]`)
            console.log("No Compatible Subtitles")
        }

        if (this.channel.icon !== '' && this.channel.overlayIcon && lineupItem.type === 'program') // Add the channel icon to ffmpeg input if enabled
            tmpargs.splice(vidStream - 1, 0, '-i', this.channel.icon)

        // Per-program guard before the real FFmpeg process starts.
        // This does NOT replace encoders yet: current filter_complex yields CPU frames.
        // Only verified end-to-end GPU pipelines may change tmpargs in a future stage.
        const hardwareAssessment = assessPlayback({
            mode: this.opts.hardwareMode || 'off',
            args: tmpargs,
            filters: {
                subtitleBurnIn: sub !== null && lineupItem.type !== 'commercial',
                iconOverlay: this.channel.icon !== '' && this.channel.overlayIcon && lineupItem.type === 'program',
                deinterlace: deinterlace !== 'null'
            }
        })
        if (this.opts.hardwareMode && this.opts.hardwareMode !== 'off' && process.env.DEBUG)
            console.log(`Hardware preflight: ${hardwareAssessment.reason}; existing FFmpeg configuration preserved`)

        // Experimental VA-API encoding. Both opt-ins are required: do not alter
        // any established installation or custom FFmpeg template by default.
        // The GPU test is deliberately performed outside live playback.
        if (process.env.PSEUDOTV_EXPERIMENTAL_VAAPI === '1' &&
            this.opts.hardwareMode === 'vaapi') {
            const graphIndex = tmpargs.indexOf('-filter_complex')
            const graph = graphIndex === -1 ? '' : tmpargs[graphIndex + 1]
            const encoderIndex = tmpargs.findIndex((arg, i) =>
                (arg === '-c:v' || arg === '-codec:v') && tmpargs[i + 1] === 'libx264')
            if (graphIndex !== -1 && typeof graph === 'string' &&
                graph.endsWith('[v]') && encoderIndex !== -1) {
                // Final CPU filters (including subtitles/overlays) stay intact.
                // Upload NV12 frames only after all CPU processing is complete.
                const sizeIndex = tmpargs.indexOf('-s')
                const size = sizeIndex >= 0 ? tmpargs[sizeIndex + 1] : null
                const validSize = typeof size === 'string' && /^[1-9][0-9]*x[1-9][0-9]*$/.test(size)
                const scaleFilter = validSize ? 'scale=' + size.replace('x', ':') + ',' : ''
                tmpargs[graphIndex + 1] = graph.slice(0, -3) +
                    '[vaapi_cpu];[vaapi_cpu]' + scaleFilter + 'format=nv12,hwupload[v]'
                tmpargs[encoderIndex + 1] = 'h264_vaapi'
                // Scaling happens before hwupload, not on GPU frames.
                for (let i = tmpargs.length - 2; i >= 0; i--) {
                    if (validSize && tmpargs[i] === '-s')
                        tmpargs.splice(i, 2)
                }

                // VA-API CQP works on the verified Intel UHD 630; legacy
                // x264 preset and bitrate-control options are incompatible.
                const removeWithValue = new Set([
                    '-preset', '-b:v', '-b:v:0', '-maxrate:v',
                    '-bufsize:v', '-minrate:v', '-crf', '-qp'
                ])
                for (let i = tmpargs.length - 2; i >= 0; i--) {
                    if (removeWithValue.has(tmpargs[i])) tmpargs.splice(i, 2)
                }
                const firstInput = tmpargs.indexOf('-i')
                if (firstInput !== -1) {
                    tmpargs.splice(0, 0, '-init_hw_device',
                        'vaapi=va:' + (process.env.PSEUDOTV_VAAPI_DEVICE || '/dev/dri/renderD128'),
                        '-filter_hw_device', 'va')
                    const encoderAt = tmpargs.indexOf('h264_vaapi')
                    tmpargs.splice(encoderAt + 1, 0,
                        '-rc_mode', 'CQP', '-qp', '23')
                    console.log('Experimental VA-API CQP 23 encoder enabled')
                }
            } else {
                console.warn('VA-API requested but this FFmpeg template is unsupported; keeping software')
            }
        }

        this.offset += lineupItem.duration / 1000
        this.ffmpeg = spawn(this.ffmpegPath, tmpargs)
        this.ffmpeg.stdout.on('data', (chunk) => {
            this.emit('data', chunk)
        })
        if (this.opts.logFfmpeg) {
            this.ffmpeg.stderr.on('data', (chunk) => {
                process.stderr.write(chunk)
            })
        }
        this.ffmpeg.on('close', (code) => {
            if (fs.existsSync(`${process.env.DATABASE}/${uniqSubFileName}.ass`))
                fs.unlinkSync(`${process.env.DATABASE}/${uniqSubFileName}.ass`)
            if (code === null)
                this.emit('close', code)
            else if (code === 0)
                this.emit('end')
            else if (code === 255)
                this.emit('close', code)
            else
                this.emit('error', { code: code, message: `FFmpeg exited with code ${code}` })
        })
    }
    kill() {
        this.ffmpeg.kill()
    }
}

module.exports = FFMPEG
