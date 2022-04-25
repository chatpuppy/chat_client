import logger from '@chatpuppy/utils/logger';
import { v4 as uuid } from 'uuid';
import { gun } from "../initGundb";
import Group from './group';
import User from './user';
import group from "./group";

function delay(ms: number) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}


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
        let messages = [] as Array<MessageDocument>;
        // gun.get('messages').get(groupId).map().on(  function(message) {
        //     if( message){
        //         // messages.push(message as MessageDocument);
        //     }
        // })
        gun.get('messages').get(groupId).map().on((data, key) => {
            if (data) {
                messages.push(data as MessageDocument);
            }
        })
        await delay(100)
        return messages
    },

    async get_one(uuid: string) {
        let message = {} as MessageDocument
        gun.get("messages").get(uuid).on((data, key) => {
            message = data
        })
        return message
    },

    async create(message: MessageDocument, to: string = '') {
        message.uuid = uuid()
        message.deleted = false
        logger.info('to', to)
        if ( to != '') {
            gun.get("messages").get(to).get(message.uuid).put(message)
        }
        logger.info("sendMessage", message)
        return message
    }
}

export interface MessageDocument extends Document {
    uuid: string;
    /** sender */
    from: string;
    /** receiver, When sent to a group, it is the group _id, and when sent to an individual, it is the spliced value of the _ IDs of two people in order of size. */
    to: string;
    /** Type, text: text message, image: picture message, code: code message, invite: invitation to join the group message, system: system message. */
    type: string;
    /** Content, some message types will be saved as JSON */
    content: string;
    /** createTime */
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