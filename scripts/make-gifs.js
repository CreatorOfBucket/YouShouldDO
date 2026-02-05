const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function listPngs(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    return fs
        .readdirSync(dirPath)
        .filter(name => name.toLowerCase().endsWith('.png'))
        .sort()
        .map(name => path.join(dirPath, name));
}

function ensureFfmpeg() {
    const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (result.status === 0) return;
    throw new Error('ffmpeg not found. Please install ffmpeg and ensure it is on PATH.');
}

function makeGifFromPngs({ inputDir, outPath, fps }) {
    // Use a palette to minimize GIF flicker.
    const palettePath = path.join(path.dirname(outPath), `${path.basename(outPath, '.gif')}.palette.png`);

    const pattern = path.join(inputDir, '%03d.png');

    const genPalette = spawnSync(
        'ffmpeg',
        [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-framerate',
            String(fps),
            '-i',
            pattern,
            '-vf',
            'palettegen=stats_mode=diff',
            palettePath
        ],
        { stdio: 'inherit' }
    );
    if (genPalette.status !== 0) {
        throw new Error(`ffmpeg palettegen failed for ${inputDir}`);
    }

    const makeGif = spawnSync(
        'ffmpeg',
        [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-framerate',
            String(fps),
            '-i',
            pattern,
            '-i',
            palettePath,
            '-lavfi',
            'paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
            outPath
        ],
        { stdio: 'inherit' }
    );
    if (makeGif.status !== 0) {
        throw new Error(`ffmpeg gif render failed for ${inputDir}`);
    }

    fs.unlinkSync(palettePath);
}

function main() {
    const repoRoot = path.join(__dirname, '..');
    const assetsDir = path.join(repoRoot, 'assets');
    const framesRoot = path.join(assetsDir, 'frames');
    const addDir = path.join(framesRoot, 'add');
    const delDir = path.join(framesRoot, 'delete');

    const addFrames = listPngs(addDir);
    const delFrames = listPngs(delDir);

    if (addFrames.length < 2) {
        throw new Error(`Not enough frames for add demo: ${addDir}`);
    }
    if (delFrames.length < 2) {
        throw new Error(`Not enough frames for delete demo: ${delDir}`);
    }

    ensureFfmpeg();

    makeGifFromPngs({ inputDir: addDir, outPath: path.join(assetsDir, 'add-task.gif'), fps: 10 });
    makeGifFromPngs({ inputDir: delDir, outPath: path.join(assetsDir, 'delete-task.gif'), fps: 12 });
}

main();
