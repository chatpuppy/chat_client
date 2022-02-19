import fetch from './fetch';

/**
 * @param blob 
 * @param fileName 
 */
export default async function uploadFile(
    blob: Blob | string,
    fileName: string,
    isBase64 = false,
): Promise<string> {
    const [uploadErr, result] = await fetch('uploadFile', {
        file: blob,
        fileName,
        isBase64,
    });
    if (uploadErr) {
        throw Error(`Upload image failed::${uploadErr}`);
    }
    return result.url;
}

export function getOSSFileUrl(url: string | number = '', process = '') {
    if (typeof url === 'number') {
        return url;
    }
    const [rawUrl = '', extraPrams = ''] = url.split('?');
    if (/^\/\/cdn\.chatpuppy\.com/.test(rawUrl)) {
        return `https:${rawUrl}?x-oss-process=${process}${
            extraPrams ? `&${extraPrams}` : ''
        }`;
    }
    if (url.startsWith('//')) {
        return `https:${url}`;
    }
    if (url.startsWith('/')) {
        return `https://app.chatpuppy.com${url}`;
    }
    return `${url}`;
}
