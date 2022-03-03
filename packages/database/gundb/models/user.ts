import logger from '@fiora/utils/logger';
import { v4 as uuid } from 'uuid';
import { gun } from "../initGundb";
import { MessageDocument } from './message';
import { FriendDocument } from './friend';


const User = {

    async createUser(user: UserDocument) {
        const linkId = uuid()

        await gun.get("users").get(user.username).put({
            uuid: linkId,
            username: user.username,
            password: user.password,
            lastLoginIp: user.lastLoginIp,
            // lastLoginTime: user.lastLoginTime,
            // tag: user.tag,
            // expressions: user.expressions,
            avatar: user.avatar
        }, (ack) => {
        })

        let userLink = {} as UserDocument
        await gun.get("users").get(user.username).on((data, key) => {
            userLink = data
            // return data
        })
        return userLink
    },

    async save(user: UserDocument) {
        await gun.get("users").get(user.username).put(user)
        return user
    },

    async saveAvatarByName(user: UserDocument) {
        let currentUser = {} as UserDocument
        await gun.get('users').get(user.username).on((data, key) => {
            currentUser = data
        })
        currentUser.avatar = user.avatar
        await gun.get('users').get(currentUser.username).put(currentUser)
        return {}
    },

    // eslint-disable-next-line no-shadow
    async get_one(uuid: string) {
        let user = {} as UserDocument
        await gun.get("users").map().on((data) => {
            if (data.uuid === uuid) {
                data._id = uuid;
                user = data
            }
        })
        return user
    },

    async getUserName(username: string) {
        const users = [] as Array<UserDocument>
        await gun.get('users').map().on((data, key) => {
            try {

                const isFlag = key.includes(username)
                if(isFlag) {
                    data._id = data.uuid
                    users.push(data)
                }
            } catch (e) {
            }
        })
        return users
    },

    async auth(username: string, passwrord:string) {
        const userList = [] as Array<UserDocument>
        gun.get("users").map().on((data, key) => {
            userList.push(data)
        })
        for (let index = 0; index < userList.length; index++) {
            const element = userList[index];
            if (element.username === username && element.password === passwrord) {
                return userList[index]
            }
        }
        return {} as UserDocument
    },

    async getUserMessage(messages: Array<MessageDocument>) {
        const newMessages: any = []
        const users = [] as Array<UserDocument>
        gun.get("users").map().on((data, key) => {
            users.push(data)
        })

        users.forEach(user => {
            messages.forEach(element => {
                if (element.from === user.uuid) {
                    user._id = user.uuid
                    const message = {
                        _id: element.uuid,
                        uuid: element.uuid,
                        username: user.username,
                        avatar: user.avatar,
                        type: element.type,
                        content: element.content,
                        from: user,
                        to: element.to,
                        createTime: element.createTime,
                        deleted: element.deleted,
                    };
                    newMessages.push(message)

                }
            });
        });
        return newMessages
    },

    async getDataByFriend(friends: FriendDocument[]) {
        const currentFriends = [] as any[]
        const users = [] as UserDocument[]
        await gun.get('users').map().on(data => {
            users.push(data)
        })
        friends.forEach(e => {
            users.forEach(user => {
                if (e.to === user.uuid){
                    const friend = {
                        uuid: e.uuid,
                        to: {
                            _id: e.uuid,
                            avatar: user.avatar,
                            username: user.username,
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
    /** 用户名 */
    username: string;
    /** 密码加密盐 */
    salt: string;
    /** 加密的密码 */
    password: string;
    /** 头像 */
    avatar: string;
    /** 用户标签 */
    tag: string;
    /** 表情收藏 */
    expressions: string[];
    /** 创建时间 */
    createTime: Date;
    /** 最后登录时间 */
    lastLoginTime: Date;
    /** 最后登录IP */
    lastLoginIp: string;
}

export default User;