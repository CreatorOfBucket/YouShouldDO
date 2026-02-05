from __future__ import annotations

from pathlib import Path

from PIL import Image


def load_frames(dir_path: Path) -> list[Image.Image]:
    frames = sorted(dir_path.glob('*.png'))
    if len(frames) < 2:
        raise RuntimeError(f'Not enough PNG frames in: {dir_path}')
    return [Image.open(p).convert('RGB') for p in frames]


def build_global_palette(frames: list[Image.Image], colors: int = 256) -> Image.Image:
    # Build a palette from a montage of thumbnails across frames.
    # Thumbnails reduce work while keeping color distribution.
    thumb_w, thumb_h = 160, 275
    cols = 6
    rows = (len(frames) + cols - 1) // cols
    montage = Image.new('RGB', (thumb_w * cols, thumb_h * rows), color=(0, 0, 0))

    for i, frame in enumerate(frames):
        thumb = frame.resize((thumb_w, thumb_h), resample=Image.Resampling.BILINEAR)
        x = (i % cols) * thumb_w
        y = (i // cols) * thumb_h
        montage.paste(thumb, (x, y))

    # Quantize montage to get a stable palette.
    # FASTOCTREE works for RGBA images in Pillow.
    palette_img = montage.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    return palette_img


def quantize_frames(frames: list[Image.Image], palette_img: Image.Image) -> list[Image.Image]:
    # Use the same palette for all frames to avoid flicker.
    quantized: list[Image.Image] = []
    for frame in frames:
        q = frame.quantize(palette=palette_img, dither=Image.Dither.NONE)
        quantized.append(q)
    return quantized


def save_gif(frames_p: list[Image.Image], out_path: Path, durations_ms: list[int]) -> None:
    if len(frames_p) != len(durations_ms):
        raise ValueError('durations_ms length must match frame count')

    out_path.parent.mkdir(parents=True, exist_ok=True)
    first, rest = frames_p[0], frames_p[1:]
    first.save(
        str(out_path),
        save_all=True,
        append_images=rest,
        optimize=False,
        loop=0,
        duration=durations_ms,
        disposal=2
    )


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    assets_dir = repo_root / 'assets'
    frames_root = assets_dir / 'frames'

    add_frames_rgb = load_frames(frames_root / 'add')
    del_frames_rgb = load_frames(frames_root / 'delete')

    # Use a shared palette across both gifs for maximum stability.
    palette_img = build_global_palette(add_frames_rgb + del_frames_rgb, colors=256)

    add_frames_p = quantize_frames(add_frames_rgb, palette_img)
    del_frames_p = quantize_frames(del_frames_rgb, palette_img)

    add_durations = [110] * len(add_frames_p)
    add_durations[-1] = 700

    del_durations = [100] * len(del_frames_p)
    del_durations[-1] = 800

    save_gif(add_frames_p, assets_dir / 'add-task.gif', add_durations)
    save_gif(del_frames_p, assets_dir / 'delete-task.gif', del_durations)


if __name__ == '__main__':
    main()
