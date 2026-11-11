import asyncio
import io
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import av
import imageio_ffmpeg
from fastapi import UploadFile

from app.captions import format_ass
from app import main
from app.main import _render_video


class VideoRenderTests(unittest.TestCase):
    def test_render_burns_karaoke_captions_and_keeps_audio(self) -> None:
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / "source.mp4"
            output_path = directory / "captioned.mp4"
            subprocess.run(
                [
                    ffmpeg,
                    "-y",
                    "-f", "lavfi",
                    "-i", "color=c=black:s=320x240:r=24:d=2",
                    "-f", "lavfi",
                    "-i", "sine=frequency=440:sample_rate=44100:duration=2",
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    str(source_path),
                ],
                capture_output=True,
                check=True,
            )
            ass_content = format_ass(
                [
                    {
                        "text": "Hello world!",
                        "start": 0.2,
                        "end": 1.6,
                        "words": [
                            {"text": "Hello", "start": 0.2, "end": 0.7},
                            {"text": "world!", "start": 0.8, "end": 1.6},
                        ],
                    }
                ],
                "Arial",
                24,
                "#FFFFFF",
                "#FFD84D",
                320,
                240,
            )

            _render_video(source_path, output_path, ass_content)

            self.assertTrue(output_path.is_file())
            with av.open(str(output_path)) as rendered:
                self.assertTrue(rendered.streams.video)
                self.assertTrue(rendered.streams.audio)
                self.assertEqual(rendered.streams.video[0].width, 320)
                self.assertEqual(rendered.streams.video[0].height, 240)

    def test_upload_endpoint_returns_playable_and_downloadable_mp4(self) -> None:
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as temporary_directory:
            source_path = Path(temporary_directory) / "source.mp4"
            subprocess.run(
                [
                    ffmpeg,
                    "-y",
                    "-f", "lavfi",
                    "-i", "color=c=black:s=320x240:r=24:d=2",
                    "-f", "lavfi",
                    "-i", "sine=frequency=440:sample_rate=44100:duration=2",
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    str(source_path),
                ],
                capture_output=True,
                check=True,
            )
            words = [
                {"text": " Hello", "start": 0.2, "end": 0.7},
                {"text": " world!", "start": 0.8, "end": 1.6},
            ]
            segments = [{"text": "Hello world!", "start": 0.2, "end": 1.6, "words": words}]
            upload = UploadFile(filename="source.mp4", file=io.BytesIO(source_path.read_bytes()))

            with patch("app.main._transcribe", return_value=(segments, "en")):
                result = asyncio.run(
                    main.transcribe_video(
                        video=upload,
                        font_name="Arial",
                        font_size=24,
                        text_color="#FFFFFF",
                        highlight_color="#FFD84D",
                    )
                )

            output_path = main.OUTPUT_DIRECTORY / f"{result['job_id']}.mp4"
            self.addCleanup(lambda: output_path.unlink(missing_ok=True))
            self.assertTrue(output_path.is_file())
            self.assertEqual(result["video_url"], f"/api/video/{result['job_id']}")
            self.assertEqual(result["download_url"], f"/api/download/{result['job_id']}")
            self.assertEqual(main.preview_video(result["job_id"]).headers["content-disposition"].split(";")[0], "inline")
            self.assertEqual(main.download_video(result["job_id"]).headers["content-disposition"].split(";")[0], "attachment")


if __name__ == "__main__":
    unittest.main()