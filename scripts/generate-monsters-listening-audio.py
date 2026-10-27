"""Pre-render listening lines with offline US/UK and Australian TTS models.

One-time build step; NO audio-generation API call at playback time.
Requirements: kokoro-onnx, piper-tts, soundfile, ffmpeg, model weights and voices.

Example:
  python scripts/generate-monsters-listening-audio.py \
    --model /tmp/speakingym_kokoro_models/kokoro-v1.0.fp16.onnx \
    --voices /tmp/speakingym_kokoro_models/voices-v1.0.bin \
    --au-model /tmp/speakingym-au-piper.onnx \
    --au-config /tmp/speakingym-au-piper.onnx.json
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
import wave as wav_module
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT / "prototype" / "speakingym-monsters"
SOUND_DIR = PUBLIC_DIR / "audio" / "listening"
MANIFEST = PUBLIC_DIR / "listening-audio-manifest.js"
VOICE_NAMES = ("af_heart", "am_michael", "bf_emma", "bm_fable")
SPEED = {"easy": 0.95, "normal": 1.0, "hard": 1.06}
# Keep the narrator consistent as each scene gets harder. Only about 1 in 5
# scenes are Australian, so learners still hear the existing four clear voices.
# The voices come from DataCraftsmanAustralia/piper-en_AU-librivox-medium.
AU_SCENES = {
    "recommend-gift": ("magdalena", 3),
    "booking-table": ("timothy_ferguson", 5),
    "apology-late": ("magdalena", 3),
    "price-ticket": ("timothy_ferguson", 5),
    "change-time": ("magdalena", 3),
    "problem-train": ("timothy_ferguson", 5),
}
AU_LENGTH = {"easy": 1.08, "normal": 1.0, "hard": 0.94}


def catalog():
    proc = subprocess.run(
        ["node", "scripts/export-monsters-listening.mjs"],
        cwd=PROJECT, check=True, capture_output=True, text=True
    )
    return json.loads(proc.stdout)


def voice_for(row):
    if row["sceneId"] in AU_SCENES:
        return "au_" + AU_SCENES[row["sceneId"]][0]
    return VOICE_NAMES[sum(map(ord, row["sceneId"])) % len(VOICE_NAMES)]


def make_audio(model, au_model, row, destination, voice):
    from soundfile import write

    with tempfile.TemporaryDirectory(prefix="speakingym-tts-") as temp:
        wave = Path(temp) / "voice.wav"
        if voice.startswith("au_"):
            if au_model is None:
                raise RuntimeError(f"Missing Australian TTS model for {row['id']}; pass --au-model and --au-config")
            from piper.config import SynthesisConfig

            with wav_module.open(str(wave), "wb") as wav:
                au_model.synthesize_wav(
                    row["text"], wav,
                    syn_config=SynthesisConfig(
                        speaker_id=AU_SCENES[row["sceneId"]][1],
                        length_scale=AU_LENGTH[row["level"]],
                    ),
                )
        else:
            samples, rate = model.create(
                row["text"], voice=voice, speed=SPEED[row["level"]],
                lang="en-gb" if voice.startswith("b") else "en-us"
            )
            write(wave, samples, rate)
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(wave), "-ac", "1", "-codec:a", "libmp3lame",
            "-b:a", "64k", str(destination)
        ], check=True)
    return voice


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--voices", type=Path, required=True)
    parser.add_argument("--au-model", type=Path, help="Australian Piper ONNX weights; needed only to generate missing AU clips")
    parser.add_argument("--au-config", type=Path, help="Config JSON for --au-model")
    parser.add_argument("--limit", type=int, default=0, help="Create the first N clips for a smoke test")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    if not args.model.is_file() or not args.voices.is_file():
        parser.error("Both model and voices must exist; do not commit the large model weights")

    if bool(args.au_model) != bool(args.au_config):
        parser.error("Pass both --au-model and --au-config together")
    if args.au_model and (not args.au_model.is_file() or not args.au_config.is_file()):
        parser.error("Australian ONNX weights and config must exist outside the repo")

    from kokoro_onnx import Kokoro
    rows = catalog()
    SOUND_DIR.mkdir(parents=True, exist_ok=True)
    engine = Kokoro(str(args.model), str(args.voices))
    au_engine = None
    manifest = {}
    generated = 0
    for row in rows:
        # Content-addressed filenames prevent an edited transcript from ever
        # silently reusing an older recording during a later regeneration.
        digest = hashlib.sha256(row["text"].encode("utf-8")).hexdigest()[:12]
        voice = voice_for(row)
        # Voice-specific filenames prevent browser caches from playing an old
        # American/British recording after introducing the Australian accents.
        filename = f'{row["id"]}{"-au" if voice.startswith("au_") else ""}-{digest}.mp3'
        destination = SOUND_DIR / filename
        legacy = SOUND_DIR / f'{row["id"]}.mp3'
        if not destination.exists() and legacy.is_file() and not args.overwrite:
            # One-time migration for early prototype files generated by this
            # same script, before names included the transcript fingerprint.
            legacy.rename(destination)
        if (args.limit and generated >= args.limit) and not destination.is_file():
            continue
        if args.overwrite or not destination.is_file():
            if voice.startswith("au_") and au_engine is None:
                if not args.au_model:
                    parser.error(f"Australian clip missing for {row['id']}: pass --au-model and --au-config")
                from piper.voice import PiperVoice

                au_engine = PiperVoice.load(args.au_model, config_path=args.au_config)
            voice = make_audio(engine, au_engine, row, destination, voice)
            generated += 1
            print(f'{row["id"]}: {voice} ({destination.stat().st_size} bytes)', flush=True)
        manifest[row["id"]] = {
            "text": row["text"],
            "src": f'./audio/listening/{filename}',
            "voice": voice
        }

    # The browser uses a clip ONLY while its original text still matches the
    # current prompt. A curriculum change cannot silently replay stale speech.
    content = (
        "// Generated by scripts/generate-monsters-listening-audio.py.\n"
        "// Only exact matching transcript text may use a cached clip.\n"
        f"export const LISTENING_AUDIO=Object.freeze({json.dumps(manifest, ensure_ascii=False, indent=2)});\n"
    )
    MANIFEST.write_text(content, encoding="utf-8")
    print(f'Audio manifest: {len(manifest)}/{len(rows)}; created {generated} clip(s).')


if __name__ == "__main__":
    main()
