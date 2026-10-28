#!/usr/bin/env bash
# Technische Qualitätskontrolle des fertigen Videos.
set -euo pipefail
F="${1:-out/deutschland_24h_ohne_strom.mp4}"
echo "== Streams"
ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,nb_frames,sample_rate,channels:format=duration -of default=nw=1 "$F"
echo "== Exakte Videoframes"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$F"
echo "== Schwarze Abschnitte (> 0,3 s)"
ffmpeg -hide_banner -i "$F" -vf "blackdetect=d=0.3:pic_th=0.985:pix_th=0.04" -an -f null - 2>&1 | grep blackdetect || echo "keine"
echo "== Lautheit"
ffmpeg -hide_banner -i "$F" -vn -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
