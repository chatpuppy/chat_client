import logger from '@chatpuppy/utils/logger';
import { v4 as uuid } from 'uuid';
import { gun } from "../initGundb";
let nodeSocket = gun.get("sockets")

function delay(ms: number) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}

const Socket = {
    async create(socket: SocketDocument) {
        socket.createTime = new Date().toString()
        gun.get("sockets").get(socket.id).put({
            socket
        })

    },

    async getOneUser(user: string | undefined) {
        const sockets = [] as Array<SocketDocument>
        // await gun.get("sockets").map(socket => (socket && socket.hasOwnProperty('user') && socket.user == user) ? socket : undefined).once( function(socket, id) {
        //     logger.info(socket)
        //     sockets.push(socket as SocketDocument)
        // })

        await nodeSocket.map().on(  async function(socket) {
            if(socket){
                if (socket.hasOwnProperty('user') && socket.user == user) {
                    sockets.push(socket)
                }
            }
            return sockets
        })
        // gun.get("sockets").map(async socket => {
        //     if(socket){
        //         if (socket.hasOwnProperty('user') && socket.user == user) {
        //             sockets.push(socket)
        //         }
        //     }
        // })
        await delay(2000)
        return sockets
    },

    async getOne(id: string) {
        let socket = {} as SocketDocument
        await gun.get("sockets").get(id).once(data => {
            socket = data as SocketDocument
        })
        return socket
    },



    async deleteOne(id: string) {
        // @ts-ignore
        gun.get("sockets").get(id).put(null)
    },

    async getAllMembers(members: string) {
        const sockets: SocketDocument[] = []
        let membersJson: string[] = []
        try {
            membersJson = members.split(',')
        }catch (error) {
            membersJson = []
        }
        gun.get('sockets').map().on((data, key) => {
            if (data) {
                membersJson.forEach(e => {
                    if (e === data.user) {
                        sockets.push(data)
                    }
                })
            }

        })
        return sockets
    },

    async update(socket: SocketDocument) {
        await gun.get('sockets').get(socket.id).put(socket, ack => {
        })
        return socket
    },

    async deleteMany() {
        // @ts-ignore
        // gun.get('sockets').put(null)
    }

}

export interface SocketDocument {
    /** socket client id */
    id: string;
    /** Associated user id */
    user: string;
    /** ip addr */
    ip: string;
    /** system */
    os: string;
    /** browser */
    browser: string;
    /** Detailed environmental information */
    environment: string;
    /** createTime */
    createTime: string;
}

export default Socket;