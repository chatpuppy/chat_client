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

var user_gun = gun.get('users')

const User = {

    async createUser(user: UserDocument) {
        const linkId = uuid()
        user_gun.get(user.address).put({
            uuid: linkId,
            address: user.address,
            lastLoginIp: user.lastLoginIp,
            username: user.username,
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
        user_gun.get(user.address).put(user)
        return user
    },

    async saveAvatarByName(user: UserDocument) {
        // @ts-ignore
        user_gun.get(user.address).get('avatar').put(user.avatar)
    },

    async saveUsername(user:UserDocument) {
        // @ts-ignoregun.
        user_gun.get(user.address).get('username').put(user.username)
    },

    async get_one(uuid: string) {
        let current_user = {} as UserDocument
        user_gun.map().once( async (user) => {
            if(user){
                if (user.uuid == uuid){
                    user._id = user.uuid
                current_user = user as UserDocument
                }
                
            }
        })
        await delay(200)
        return current_user
    },

    async getUserName(address: string) {
        const users = [] as Array<UserDocument>
        user_gun.map(async user => {
            if(user.address === address) {
                user._id = user.uuid
                users.push(user)
            }
        })
        return users
    },

    async auth(address: string) {
        let current_user = {} as  UserDocument
        user_gun.get(address).once(async (user) => {
            if (user) {
                user._id = user.uuid
                current_user = user as UserDocument
            }
        })
        await delay(200)

        return current_user
    },

    async register(address: string) {
        let current_user = {} as  UserDocument
        user_gun.map(async user => {
            if (user.hasOwnProperty('address') && user.address === address){
                current_user = user
                return;
            }
        })
        return current_user
    },

    // TODO: 改善方案，gundb.map.on(callback) / gundb.map(callback) 替换使用 Map 维护一个全局的参数，当用户注册登入的时候通过gundb的subscribe进行[时序锁]更新维护
    // getUsersMap 获取所有用户
    async getUsersMap(): Promise<Map<string, UserDocument>> {
        const users: Map<string, UserDocument> = new Map<string, UserDocument>()
        const array: Array<UserDocument> = []
        gun.get('users').map((user: UserDocument) => {
            return new Promise<void>(resolve => { 
                array.push(user)
                resolve()
            })
        })
        await Promise.allSettled(array)
        array.forEach(user => {
            users.set(user.uuid, user)
        })
        return users
    },

    // getFriends 获取用户所有朋友
    async getFriends(uuid: string): Promise<Array<FriendDocument>> {
        const friends: Array<FriendDocument> = []
        gun.get('friends').map((friend: FriendDocument) => {
            return new Promise<void>(resolve => {
                if (friend.to === uuid) friends.push(friend)
                resolve()
            })
        })
        return Promise.all(friends)
    },

    // getMessageFriendFrom 判定消息是否来自于朋友
    // uuid: 目标用户UUID
    // from: 消息来源用户UUID
    async getMessageFriendFrom(uuid: string, from: string): Promise<FriendDocument | null> {
        const friends = await this.getFriends(uuid)
        const index = friends.findIndex(friend => friend.uuid === from)
        return index > -1 ? friends[index] : null
    },

    async getUserMessage(messages: Array<MessageDocument>): Promise<Array<any>> {
        const items: Array<any> = []
        const users = await this.getUsersMap()
        messages.forEach(async message => {
            try {
                const user = users.get(message.from)
                if (user) {
                    user._id = user.uuid
                    // const friend = await this.getMessageFriendFrom(user.uuid, message.from) // ###### Cancel this line to save time for mapping
                    const item = {
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
                        nickname: '',// friend ? friend.nickname : ''
                    }
                    items.push(item)
                }
            } catch (e) {}
        })
        return items
    },

    async getDataByFriend(friends: FriendDocument[]) {
        const currentFriends = [] as any[]
        const users = [] as UserDocument[]
        user_gun.map().on(data => {
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