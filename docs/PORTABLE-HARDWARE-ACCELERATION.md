# Portable hardware acceleration — stage 1

This stage introduces **read-only** FFmpeg capability discovery, independent of
operating system and GPU vendor. The new endpoint is `GET /api/hardware-acceleration`.

- Software: libx264 / mpeg2video
- Linux VA-API: h264_vaapi
- Intel Quick Sync: h264_qsv
- NVIDIA NVENC: h264_nvenc
- macOS VideoToolbox: h264_videotoolbox
- AMD AMF: h264_amf

A codec listed by FFmpeg is **not necessarily usable**. The hardware, drivers,
permissions and device mapping (when containerized) must also support it.
`usable: null` means **not tested**. Never auto-switch encoders based solely on
these results. Actual transcoding and encoder fallback are planned for stage 2.

No existing configuration is changed. The current FFmpeg command, video channels,
Plex and other tuners continue to behave as before.

Run the isolated tests with `node test/hardwareAcceleration.test.js`.
