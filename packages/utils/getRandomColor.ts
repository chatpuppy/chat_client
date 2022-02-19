import randomColor from 'randomcolor';

type ColorMode = 'dark' | 'bright' | 'light' | 'random';

/**
 * @param seed when passed will cause randomColor to return the same color each time
 */
export function getRandomColor(seed: string, luminosity: ColorMode = 'dark') {
    return randomColor({
        luminosity,
        seed,
    });
}

type Cache = {
    [key: string]: string;
};

const cache: Cache = {};

/**
 * @param seed 
 * @param luminosity 
 */
export function getPerRandomColor(
    seed: string,
    luminosity: ColorMode = 'dark',
) {
    if (cache[seed]) {
        return cache[seed];
    }
    cache[seed] = randomColor({ luminosity });
    return cache[seed];
}
