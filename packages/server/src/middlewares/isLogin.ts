import { Socket } from 'socket.io';

export const PLEASE_LOGIN = 'Please login first';

/**
 * Stop un-login user to use functions must loged
 */
export default function isLogin(socket: Socket) {
    const noRequireLoginEvent = new Set([
        'register',
        'login',
        'loginByToken',
        'guest',
        'getDefaultGroupHistoryMessages',
        'getDefaultGroupOnlineMembers',
        'getBaiduToken',
        'getGroupBasicInfo',
        'getSTS',
    ]);
    return async ([event, , cb]: MiddlewareArgs, next: MiddlewareNext) => {
        if (!noRequireLoginEvent.has(event) && !socket.data.user) {
            cb(PLEASE_LOGIN);
        } else {
            next();
        }
    };
}
