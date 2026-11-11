import unittest

from app.captions import format_ass, format_srt, format_vtt


class CaptionFormatTests(unittest.TestCase):
    def setUp(self) -> None:
        self.segments = [
            {
                "text": " Hello world! ",
                "start": 1.25,
                "end": 2.5,
                "words": [
                    {"text": " Hello", "start": 1.25, "end": 1.7},
                    {"text": " world!", "start": 1.8, "end": 2.5},
                ],
            }
        ]

    def test_srt_uses_phrase_timestamps(self) -> None:
        self.assertEqual(
            format_srt(self.segments),
            "1\n00:00:01,250 --> 00:00:02,500\nHello world!\n",
        )

    def test_vtt_uses_webvtt_timestamp_format(self) -> None:
        self.assertEqual(
            format_vtt(self.segments),
            "WEBVTT\n\n00:00:01.250 --> 00:00:02.500\nHello world!\n",
        )

    def test_ass_contains_font_colors_and_word_timing(self) -> None:
        result = format_ass(self.segments, "Arial Black", 48, "#FFFFFF", "#FFD84D")
        self.assertIn("Style: Default,Arial Black,48,&H004DD8FF,&H00FFFFFF", result)
        self.assertIn(",2,40,40,576,1", result)
        self.assertIn(r"{\kf55}Hello {\kf70}world!", result)
        self.assertIn("Dialogue: 0,0:00:01.25,0:00:02.50", result)

    def test_ass_position_scales_with_video_height(self) -> None:
        result = format_ass(self.segments, "Arial", 32, "#FFFFFF", "#FFD84D", 720, 1280)
        self.assertIn(",2,40,40,384,1", result)


if __name__ == "__main__":
    unittest.main()