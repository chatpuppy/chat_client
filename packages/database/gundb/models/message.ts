import logger from '@fiora/utils/logger';
import { v4 as uuid } from 'uuid';
import { gun } from "../initGundb";
import Group from './group';
import User from './user';


const Message = {
    async get(to: string) {
        const messages = [] as Array<MessageDocument>;
        await gun.get("messages").map().on((data, key) => {
            if (data) {
                data.id = data.uuid
                messages.push(data);
            }
        })
        // const messagesList = messages.map(message =>)
        return messages
    },

    async getToGroup(groupId: string) {
        const messages = [] as Array<MessageDocument>;
        gun.get("messages").map().on((data, key) => {
            if (data.to === groupId) {
                messages.push(data);
            }
        })
        return messages
    },

    async get_one(uuid: string) {
        let message = {} as MessageDocument
        gun.get("messages").get(uuid).on((data, key) => {
            message = data
        })
        return message
    },

    async create(message: MessageDocument) {
        message.uuid = uuid()
        message.deleted = false
        await gun.get("messages").get(message.uuid).put(message)
        return message
    }
}

export interface MessageDocument extends Document {
    uuid: string;
    /** 发送人 */
    from: string;
    /** 接受者, 发送给群时为群_id, 发送给个人时为俩人的_id按大小序拼接后值 */
    to: string;
    /** 类型, text: 文本消息, image: 图片消息, code: 代码消息, invite: 邀请加群消息, system: 系统消息 */
    type: string;
    /** 内容, 某些消息类型会存成JSON */
    content: string;
    /** 创建时间 */
    createTime: string;
    /** Has it been deleted */
    deleted: boolean;
}

export default Message;

interface SendMessageData {
    to: string;
    type: string;
    content: string;
}

export async function handleInviteV2Message(message: MessageDocument) {
    if (message.type === 'inviteV2') {
        const inviteInfo = JSON.parse(message.content);
        if (inviteInfo.inviter && inviteInfo.group) {
            const [user, group] = await Promise.all([
                User.get_one(inviteInfo.inviter),
                Group.get(inviteInfo.group ),
            ]);
            if (user && group) {
                message.content = JSON.stringify({
                    inviter: inviteInfo.inviter,
                    inviterName: user?.username,
                    group: inviteInfo.group,
                    groupName: group.name,
                });
            }
        }
    }
}

export async function handleInviteV2MessageModify(message: SendMessageData) {
    if (message.type === 'inviteV2') {
        const inviteInfo = JSON.parse(message.content);
        if (inviteInfo.inviter && inviteInfo.group) {
            const [user, group] = await Promise.all([
                User.get_one(inviteInfo.inviter),
                Group.get(inviteInfo.group ),
            ]);
            if (user && group) {
                message.content = JSON.stringify({
                    inviter: inviteInfo.inviter,
                    inviterName: user?.username,
                    group: inviteInfo.group,
                    groupName: group.name,
                });
            }
        }
    }
}

export async function handleInviteV2Messages(messages: MessageDocument[]) {
    return Promise.all(
        messages.map(async (message) => {
            if (message.type === 'inviteV2') {
                await handleInviteV2Message(message);
            }
        }),
    );
}