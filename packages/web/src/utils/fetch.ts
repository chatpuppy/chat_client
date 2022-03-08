import Message from '../components/Message';
import socket from '../socket';

import { SEAL_TEXT, SEAL_USER_TIMEOUT } from '../../../utils/const';

/** Is the user banned? */
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
                /**
                * After the server returns to the banned state, the state is stored locally.
                * When the user triggers the interface request again, it directly refuses.
                */
                if (res === SEAL_TEXT) {
                    isSeal = true;
                    // User ban is different from ip ban, which takes a short time.
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
