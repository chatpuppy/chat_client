// import { SEAL_TEXT } from '@chatpuppy/utils/const';
// import { getSocketIp } from '@chatpuppy/utils/socket';
// import { Socket } from 'socket.io';
// import {
//     getSealIpKey,
//     getSealUserKey,
//     Redis,
// } from '@chatpuppy/database/redis/initRedis';

// /**
//  * Stop banned users
//  */
// export default function seal(socket: Socket) {
//     return async ([, , cb]: MiddlewareArgs, next: MiddlewareNext) => {
//         const ip = getSocketIp(socket);
//         const isSealIp = await Redis.has(getSealIpKey(ip));
//         const isSealUser =
//             socket.data.user &&
//             (await Redis.has(getSealUserKey(socket.data.user)));

//         if (isSealUser || isSealIp) {
//             cb(SEAL_TEXT);
//         } else {
//             next();
//         }
//     };
// }
