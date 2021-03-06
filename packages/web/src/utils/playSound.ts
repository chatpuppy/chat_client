import DefaultSound from '@chatpuppy/assets/audios/default.mp3';
import AppleSound from '@chatpuppy/assets/audios/apple.mp3';
import PcQQSound from '@chatpuppy/assets/audios/pcqq.mp3';
import MobileQQSound from '@chatpuppy/assets/audios/mobileqq.mp3';
import MoMoSound from '@chatpuppy/assets/audios/momo.mp3';
import HuaJiSound from '@chatpuppy/assets/audios/huaji.mp3';

type Sounds = {
    [key: string]: string;
};

const sounds: Sounds = {
    default: DefaultSound,
    apple: AppleSound,
    pcqq: PcQQSound,
    mobileqq: MobileQQSound,
    momo: MoMoSound,
    huaji: HuaJiSound,
};

let prevType = 'default';
const $audio = document.createElement('audio');
const $source = document.createElement('source');
$audio.volume = 0.6;
$source.setAttribute('type', 'audio/mp3');
$source.setAttribute('src', sounds[prevType]);
$audio.appendChild($source);
document.body.appendChild($audio);

let isPlaying = false;

async function play() {
    if (!isPlaying) {
        isPlaying = true;

        try {
            await $audio.play();
        } catch (err) {
            console.warn('Play alert failed', err.message);
        } finally {
            isPlaying = false;
        }
    }
}

export default function playSound(type = 'default') {
    if (type !== prevType) {
        $source.setAttribute('src', sounds[type]);
        $audio.load();
        prevType = type;
    }
    play();
}
