from __future__ import annotations

import re
from typing import Any


ALLOWED_FONTS = {
    "Arial",
    "Arial Black",
    "Impact",
    "Trebuchet MS",
    "Verdana",
    "Georgia",
}
COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


def format_timestamp(seconds: float, separator: str) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{whole_seconds:02}{separator}{milliseconds:03}"


def format_ass_timestamp(seconds: float) -> str:
    centiseconds = max(0, round(seconds * 100))
    hours, remainder = divmod(centiseconds, 360_000)
    minutes, remainder = divmod(remainder, 6_000)
    whole_seconds, centiseconds = divmod(remainder, 100)
    return f"{hours}:{minutes:02}:{whole_seconds:02}.{centiseconds:02}"


def _ass_color(value: str) -> str:
    if not COLOR_PATTERN.fullmatch(value):
        raise ValueError("Colors must be six-digit hex values.")
    red, green, blue = value[1:3], value[3:5], value[5:7]
    return f"&H00{blue}{green}{red}".upper()


def _escape_ass_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def format_srt(segments: list[dict[str, Any]]) -> str:
    entries = []
    for index, segment in enumerate(segments, start=1):
        text = str(segment["text"]).strip()
        if not text:
            continue
        start = format_timestamp(float(segment["start"]), ",")
        end = format_timestamp(float(segment["end"]), ",")
        entries.append(f"{index}\n{start} --> {end}\n{text}")
    return "\n\n".join(entries) + ("\n" if entries else "")


def format_vtt(segments: list[dict[str, Any]]) -> str:
    entries = ["WEBVTT", ""]
    for segment in segments:
        text = str(segment["text"]).strip()
        if not text:
            continue
        start = format_timestamp(float(segment["start"]), ".")
        end = format_timestamp(float(segment["end"]), ".")
        entries.extend([f"{start} --> {end}", text, ""])
    return "\n".join(entries)


def format_ass(
    segments: list[dict[str, Any]],
    font_name: str,
    font_size: int,
    text_color: str,
    highlight_color: str,
    play_width: int = 1080,
    play_height: int = 1920,
) -> str:
    if font_name not in ALLOWED_FONTS:
        raise ValueError("Choose a supported font.")
    if not 20 <= font_size <= 96:
        raise ValueError("Font size must be between 20 and 96.")
    if play_width <= 0 or play_height <= 0:
        raise ValueError("Video dimensions must be positive.")

    primary = _ass_color(highlight_color)
    secondary = _ass_color(text_color)
    margin_vertical = round(play_height * 0.30)
    rows = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {play_width}",
        f"PlayResY: {play_height}",
        "ScaledBorderAndShadow: yes",
        "WrapStyle: 2",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font_name},{font_size},{primary},{secondary},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,40,40,{margin_vertical},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    for segment in segments:
        words = segment.get("words") or []
        start = float(segment["start"])
        end = float(segment["end"])
        if words:
            chunks: list[list[dict[str, Any]]] = []
            current_chunk: list[dict[str, Any]] = []
            for word in words:
                if current_chunk and (
                    len(current_chunk) >= 4
                    or float(word["end"]) - float(current_chunk[0]["start"]) > 2.5
                ):
                    chunks.append(current_chunk)
                    current_chunk = []
                current_chunk.append(word)
                if str(word["text"]).strip().endswith((".", "!", "?")):
                    chunks.append(current_chunk)
                    current_chunk = []
            if current_chunk:
                chunks.append(current_chunk)

            for chunk in chunks:
                parts = []
                for index, word in enumerate(chunk):
                    word_start = float(word["start"])
                    next_start = float(chunk[index + 1]["start"]) if index + 1 < len(chunk) else float(word["end"])
                    duration = max(1, round((next_start - word_start) * 100))
                    text = _escape_ass_text(str(word["text"]).strip())
                    if text:
                        parts.append(f"{{\\kf{duration}}}{text} ")
                caption = "".join(parts).strip()
                if caption:
                    rows.append(
                        f"Dialogue: 0,{format_ass_timestamp(float(chunk[0]['start']))},"
                        f"{format_ass_timestamp(float(chunk[-1]['end']))},Default,,0,0,0,,{caption}"
                    )
        else:
            caption = _escape_ass_text(str(segment["text"]).strip())
            if caption:
                rows.append(
                    f"Dialogue: 0,{format_ass_timestamp(start)},{format_ass_timestamp(end)},Default,,0,0,0,,{caption}"
                )

    return "\n".join(rows) + "\n"