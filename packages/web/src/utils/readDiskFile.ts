export interface ReadFileResult {
    filename: string;
    ext: string;
    type: string;
    result: Blob | ArrayBuffer | string;
    length: number;
}

/**
 * Read local file
 * @param {string} resultType {blob|base64}, default blob
 * @param {string} accept acceptable file type, default * / *
 */
export default async function readDiskFIle(
    resultType = 'blob',
    accept = '*/*',
) {
    const result: ReadFileResult | null = await new Promise((resolve) => {
        const $input = document.createElement('input');
        $input.style.display = 'none';
        $input.setAttribute('type', 'file');
        $input.setAttribute('accept', accept);

        $input.onclick = () => {
            // @ts-ignore
            $input.value = null;
            document.body.onfocus = () => {
                setTimeout(() => {
                    if ($input.value.length === 0) {
                        resolve(null);
                    }
                    document.body.onfocus = null;
                }, 500);
            };
        };
        $input.onchange = (e: Event) => {
            // @ts-ignore
            const file = e.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onloadend = function handleLoad() {
                if (!this.result) {
                    resolve(null);
                    return;
                }
                // @ts-ignore
                resolve({
                    filename: file.name,
                    ext: file.name
                        .split('.')
                        .pop()
                        .toLowerCase(),
                    type: file.type,
                    // @ts-ignore
                    result: this.result,
                    length:
                        resultType === 'blob'
                            ? (this.result as ArrayBuffer).byteLength
                            : (this.result as string).length,
                });
            };

            switch (resultType) {
                case 'blob': {
                    reader.readAsArrayBuffer(file);
                    break;
                }
                case 'base64': {
                    reader.readAsDataURL(file);
                    break;
                }
                default: {
                    reader.readAsArrayBuffer(file);
                }
            }
        };
        $input.click();
    });

    if (result && resultType === 'blob') {
        result.result = new Blob(
            [new Uint8Array(result.result as ArrayBuffer)],
            {
                type: result.type,
            },
        );
    }
    return result;
}
