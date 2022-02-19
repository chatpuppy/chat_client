import Message from '../components/Message';
import socket from '../socket';

import { SEAL_TEXT, SEAL_USER_TIMEOUT } from '../../../utils/const';

let isSeal = false;

export default function fetch<T = any>(
    event: string,
    data = {},
    { toast = true } = {},
): Promise<[string | null, T | null]> {
    if (isSeal) {
        Message.error(SEAL_TEXT);
        return Promise.resolve([SEAL_TEXT, null]);
    }
    return new Promise((resolve) => {
        socket.emit(event, data, (res: any) => {
            if (typeof res === 'string') {
                if (toast) {
                    Message.error(res);
                }
                
                if (res === SEAL_TEXT) {
                    isSeal = true;

                    setTimeout(() => {
                        isSeal = false;
                    }, SEAL_USER_TIMEOUT);
                }
                resolve([res, null]);
            } else {
                resolve([null, res]);
            }
        });
    });
}
