import logger from '@chatpuppy/utils/logger';
import { v4 as uuid } from 'uuid';
import { gun } from "../initGundb";
import { MessageDocument } from './message';
import friend, { FriendDocument } from './friend';

function delay(ms: number) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}

const User = {

    async createUser(user: UserDocument) {
        const linkId = uuid()
        gun.get("users").get(user.address).put({
            uuid: linkId,
            address: user.address,
            lastLoginIp: user.lastLoginIp,
            username: user.address,
            // lastLoginTime: user.lastLoginTime,
            // tag: user.tag,
            // expressions: user.expressions,
            avatar: user.avatar
        })

        // gun.get("users").get(user.address).once((data, key) => {
        //     if (data) {
        //         // @ts-ignore
        //         user = data
        //     }
        //     // return data
        // })
        user.uuid = linkId
        return user
    },

    async save(user: UserDocument) {
        await gun.get("users").get(user.address).put(user)
        return user
    },

    async saveAvatarByName(user: UserDocument) {
        // @ts-ignore
        gun.get('users').get(user.address).get('avatar').put(user.avatar)
    },

    async saveUsername(user:UserDocument) {
        // @ts-ignoregun.
        gun.get('users').get(user.address).get('username').put(user.username)
    },

    async get_one(uuid: string) {
        let current_user = {} as UserDocument
        gun.get("users").map( async user => {
            if(user.uuid == uuid) {
                user._id = uuid
                current_user = user
            }
        })
        return current_user
    },

    async getUserName(address: string) {
        const users = [] as Array<UserDocument>
        gun.get('users').map(async user => {
            if(user.address === address) {
                user._id = user.uuid
                users.push(user)
            }
        })
        return users
    },

    async auth(address: string) {
        let current_user = {} as  UserDocument
        gun.get("users").map(user => {
            if (user) {
                if (user.address === address) {
                    user._id = user.uuid
                    current_user = user
                }
            }
        })

        return current_user
    },

    async register(address: string) {
        let current_user = {} as  UserDocument
        gun.get("users").map(async user => {
            if (user.hasOwnProperty('address') && user.address === address){
                current_user = user
            }
        })
        return current_user
    },

    async getUserMessage(messages: Array<MessageDocument>) {
        const newMessages: any = []
        const users = [] as Array<UserDocument>

        for(let i = 0; i < messages.length; i++) {
            const message = messages[i]
            gun.get("users").map( async user => {
                if (user) {
                    if (typeof user.uuid != undefined && user.uuid === message.from) {
                        user._id = user.uuid
                        let current_friend = {} as FriendDocument
                        gun.get("friends").map(async friend => {
                            if (friend) {
                                if (friend.to == user.uuid && message.from == user.uuid) {
                                    current_friend = friend
                                }
                            }
                        })
                        const new_message = {
                            _id: message.uuid,
                            uuid: message.uuid,
                            username: user.username,
                            avatar: user.avatar,
                            type: message.type,
                            content: message.content,
                            from: user,
                            to: message.to,
                            createTime: message.createTime,
                            deleted: message.deleted,
                            nickname: current_friend.nickname ? current_friend.nickname : ''
                        }
                        newMessages.push(new_message)
                    }
                }
            })
        }
        await delay(500)
        return newMessages
    },

    async getDataByFriend(friends: FriendDocument[]) {
        const currentFriends = [] as any[]
        const users = [] as UserDocument[]
        await gun.get('users').map().on(data => {
            if (data) {
                users.push(data)
            }
        })
        friends.forEach(e => {
            users.forEach(user => {
                if (e.to === user.uuid){
                    const friend = {
                        uuid: e.uuid,
                        to: {
                            _id: user.uuid,
                            avatar: user.avatar,
                            username: user.username,
                            nickname: e.nickname
                        },
                        from: e.from,
                        createTime: e.createTime
                    }
                    currentFriends.push(friend)
                }
            })
        })
        return currentFriends
    }
}


export interface UserDocument {
    _id: string;
    uuid: string;
    /** username */
    username: string;
    /** Cryptographic salt */
    salt: string;
    /** Wallet Adress */
    address: string;
    /** Avatar */
    avatar: string;
    /** user tag */
    tag: string;
    /** Expression collection */
    expressions: string[];
    /** createTime */
    createTime: Date;
    /** lastLoginTime */
    lastLoginTime: Date;
    /** lastLoginIp */
    lastLoginIp: string;
}

export default User;