/**
 * Compress image
 * @param image 
 * @param mimeType 
 * @param quality 
 */
export default function compressImage(
    image: HTMLImageElement,
    mimeType: string,
    quality = 1,
): Promise<Blob | null> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(image, 0, 0);
            canvas.toBlob(resolve, mimeType, quality);
        } else {
            resolve(null);
        }
    });
}
