import xss from 'xss';

/**
 * xss process
 * @param text 
 */
export default function processXss(text: string) {
    return xss(text);
}
