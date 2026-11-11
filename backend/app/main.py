from __future__ import annotations

import asyncio
import os
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from threading import Lock
from typing import Any

import av
import imageio_ffmpeg
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from faster_whisper import WhisperModel

from app.captions import ALLOWED_FONTS, COLOR_PATTERN, format_ass, format_srt, format_vtt


MAX_UPLOAD_BYTES = 100 * 1024 * 1024
MAX_VIDEO_SECONDS = 180
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
MODEL_SIZE = os.environ.get("TRIAL_WHISPER_MODEL", "base")
OUTPUT_DIRECTORY = Path(__file__).resolve().parents[1] / ".outputs"
OUTPUT_EXPIRY_SECONDS = 24 * 60 * 60
WINDOWS_FONTS_DIRECTORY = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"

app = FastAPI(title="Local Trial Caption Service")
_model: WhisperModel | None = None
_model_lock = Lock()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ready", "model": MODEL_SIZE}


def _load_model() -> WhisperModel:
    global _model
    with _model_lock:
        if _model is None:
            _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        return _model


def _read_video_metadata(path: Path) -> tuple[float, int, int]:
    try:
        with av.open(str(path)) as container:
            video_stream = next(iter(container.streams.video), None)
            has_video = video_stream is not None
            has_audio = bool(container.streams.audio)
            duration = container.duration / av.time_base if container.duration is not None else 0
    except Exception as error:
        raise HTTPException(status_code=400, detail="Could not read this video file.") from error

    if not has_video or not has_audio:
        raise HTTPException(status_code=400, detail="Choose a video file that contains audio.")
    if duration <= 0:
        raise HTTPException(status_code=400, detail="Could not determine the video duration.")
    if duration > MAX_VIDEO_SECONDS:
        raise HTTPException(status_code=413, detail="Trial currently accepts videos up to 3 minutes long.")
    return float(duration), video_stream.width, video_stream.height


def _escape_filter_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/").replace(":", r"\:").replace("'", r"\'").replace(",", r"\,")


def _delete_file(path: Path) -> None:
    path.unlink(missing_ok=True)


def _remove_expired_outputs() -> None:
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    cutoff = time.time() - OUTPUT_EXPIRY_SECONDS
    for path in OUTPUT_DIRECTORY.glob("*.mp4"):
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def _render_video(
    source_path: Path,
    output_path: Path,
    ass_content: str,
) -> None:
    ass_path = output_path.with_suffix(".ass")
    ass_path.write_text(ass_content, encoding="utf-8")
    subtitle_filter = f"ass=filename='{_escape_filter_path(ass_path)}'"
    if WINDOWS_FONTS_DIRECTORY.is_dir():
        subtitle_filter += f":fontsdir='{_escape_filter_path(WINDOWS_FONTS_DIRECTORY)}'"

    command = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-y",
        "-i", str(source_path),
        "-vf", subtitle_filter,
        "-threads", "2",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "26",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        str(output_path),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=900, check=False)
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=504, detail="Video rendering took too long. Try a shorter clip.") from error
    finally:
        ass_path.unlink(missing_ok=True)

    if result.returncode != 0 or not output_path.is_file():
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not render the captioned video. Try a different video format.")


def _transcribe(path: Path) -> tuple[list[dict[str, Any]], str | None]:
    model = _load_model()
    segments_iter, info = model.transcribe(
        str(path),
        beam_size=1,
        word_timestamps=True,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    segments: list[dict[str, Any]] = []
    for segment in segments_iter:
        words = [
            {
                "text": word.word,
                "start": float(word.start),
                "end": float(word.end),
            }
            for word in (segment.words or [])
        ]
        segments.append(
            {
                "text": segment.text.strip(),
                "start": float(segment.start),
                "end": float(segment.end),
                "words": words,
            }
        )
    return segments, info.language


@app.post("/api/transcribe")
async def transcribe_video(
    video: UploadFile = File(...),
    font_name: str = Form("Arial Black"),
    font_size: int = Form(48),
    text_color: str = Form("#FFFFFF"),
    highlight_color: str = Form("#FFD84D"),
) -> dict[str, Any]:
    extension = Path(video.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Upload an MP4, MOV, M4V, WebM, or MKV video.")
    if font_name not in ALLOWED_FONTS:
        raise HTTPException(status_code=400, detail="Choose a supported font.")
    if not 20 <= font_size <= 96:
        raise HTTPException(status_code=400, detail="Font size must be between 20 and 96.")
    if not COLOR_PATTERN.fullmatch(text_color) or not COLOR_PATTERN.fullmatch(highlight_color):
        raise HTTPException(status_code=400, detail="Choose valid caption colors.")

    temporary_path: Path | None = None
    try:
        size = 0
        with tempfile.NamedTemporaryFile(prefix="trial-", suffix=extension, delete=False) as temporary_file:
            temporary_path = Path(temporary_file.name)
            while chunk := await video.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Videos must be 100 MB or smaller.")
                temporary_file.write(chunk)

        duration, video_width, video_height = _read_video_metadata(temporary_path)
        segments, language = await asyncio.to_thread(_transcribe, temporary_path)
        if not segments:
            raise HTTPException(status_code=422, detail="No speech was detected in this video.")

        ass_content = format_ass(
            segments,
            font_name,
            font_size,
            text_color,
            highlight_color,
            video_width,
            video_height,
        )
        _remove_expired_outputs()
        job_id = uuid.uuid4().hex
        output_path = OUTPUT_DIRECTORY / f"{job_id}.mp4"
        await asyncio.to_thread(_render_video, temporary_path, output_path, ass_content)

        word_count = sum(len(segment["words"]) for segment in segments)
        return {
            "job_id": job_id,
            "filename": video.filename or "video",
            "duration_seconds": duration,
            "video_width": video_width,
            "video_height": video_height,
            "language": language,
            "word_count": word_count,
            "segments": segments,
            "video_url": f"/api/video/{job_id}",
            "download_url": f"/api/download/{job_id}",
            "srt": format_srt(segments),
            "vtt": format_vtt(segments),
            "ass": ass_content,
        }
    finally:
        await video.close()
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def _get_output_path(job_id: str) -> Path:
    try:
        normalized_job_id = uuid.UUID(hex=job_id).hex
    except ValueError as error:
        raise HTTPException(status_code=404, detail="Rendered video was not found.") from error

    output_path = OUTPUT_DIRECTORY / f"{normalized_job_id}.mp4"
    if not output_path.is_file():
        raise HTTPException(status_code=404, detail="Rendered video was not found or has expired.")
    return output_path


@app.get("/api/video/{job_id}")
def preview_video(job_id: str) -> FileResponse:
    output_path = _get_output_path(job_id)
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="captioned-short.mp4",
        content_disposition_type="inline",
    )


@app.get("/api/download/{job_id}")
def download_video(job_id: str) -> FileResponse:
    output_path = _get_output_path(job_id)
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="captioned-short.mp4",
    )