import { gun } from "../initGundb";
import { v4 as uuid } from 'uuid';

const  Friend = {
    async addFriend(friend: FriendDocument) {
        const linkId = uuid()
        friend.uuid = linkId
        gun.get('friends').get(linkId).put(friend)
        return friend
    },

    async get(to: string, from: string) {
        const friends = [] as FriendDocument[]
        gun.get('friends').map().on(data => {
            if (data.to === to && data.from === from) {
                friends.push((data))
            }
        })
        return friends
    },

    async getByFrom(from: string) {
        const friends = [] as FriendDocument[]

        gun.get('friends').map().on(data => {
            if (data.from === from) {
                friends.push(data)
            }
        })
        return friends
    }
}

export interface FriendDocument extends Document {
    uuid: string;
    /** 源用户id */
    from: string;
    /** 目标用户id */
    to: string;
    /** 创建时间 */
    createTime: string;
}

export default Friend;