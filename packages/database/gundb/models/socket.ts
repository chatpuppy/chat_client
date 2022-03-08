import logger from '@chatpuppy/utils/logger';
import { v4 as uuid } from 'uuid';
import { gun } from "../initGundb";

const Socket = {
    async create(socket: SocketDocument) {
        socket.createTime = new Date().toString()
        gun.get("sockets").get(socket.id).put({
            socket
        })

    },

    async getOneUser(user: string | undefined) {
        const sockets = [] as Array<SocketDocument>
        // if (typeof user === 'undefined') {
        //     return sockets
        // }
        const is_return = false;
        await gun.get("sockets").map().on(data => {
            if (data){
                if (data.user === user) {
                    sockets.push(data)
                }
            }
        })
        return sockets
    },

    async getOne(id: string) {
        let socket = {} as SocketDocument
        gun.get("sockets").get(id).on(data => {
            socket = data
        })
        return socket
    },


    async deleteOne(id: string) {
        await gun.get("sockets").get(id).put(null as any)
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