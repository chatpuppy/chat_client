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

var message_gun = gun.get('messages')


const Message = {
    async get(to: string) {
        const messages = [] as Array<MessageDocument>;
        message_gun.map().on((data, key) => {
            if (data) {
                data.id = data.uuid
                messages.push(data);
            }
        })
        // const messagesList = messages.map(message =>)
        return messages
    },

		// Get group messages
    async getToGroup(groupId: string, existCount: number = 0, createTime: string = '') {
        let messages = [] as Array<MessageDocument>;

        // var match = {
        //     '-': 1
        // }
        // logger.info(match)
        const count = 0
        let previous = 0
        if (existCount > 0) {
            previous = existCount
            existCount = previous + 15
        }else {
            existCount = 60
        }
        logger.info("previous", previous)
        logger.info("count", count)
        logger.info("existCount", existCount) // Max messages count
				logger.info('groupId', groupId)
        // @ts-ignore
        // message_gun.get(groupId).once(async (data, key) => {
            
        //     if(data){
        //         // @ts-ignore
        //         const sortable = Object.entries(data['_']['>']).sort(([,a],[,b]) => b-a).reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
        //             Object.entries(sortable).forEach(
        //             ([key, value]) => 
        //             {
        //                 message_gun.get(groupId).get(key).once( async (data, key) => {
        //                     if(data){
        //                         if (previous <= count && count < existCount){
        //                             messages.push(data as MessageDocument);
                                    
        //                         }
        //                         count++
        //                     }
        //                 })
        //             }
        //           );
                
        //     }
            
        // })
        // message_gun.get(groupId).map().on( async (data, key) => {
        //     if(data){
        //         if (previous <= count && count < existCount){
        //             messages.push(data as MessageDocument);
                    
        //         }
        //         count++
        //     }
        // })
        // -----------------------
        // match = {'.': { '>': new Date(+new Date() - 1*3600*60*60*24).toISOString(),'-': 1}, '%': 50000}
        // if (createTime != ''){
        //     // @ts-ignore
        //     match = {'.': { '>': new Date(+new Date() - 1*3600*60*60*24).toISOString(), '<': createTime}, '%': 50000}
        // }
        // -----------------------

        // var match = {
        //     // lexical queries are kind of like a limited RegEx or Glob.
        //     '.': {
        //       // property selector
        //       '>': new Date(+new Date() - 1 * 1000 * 60 * 60 * 24).toISOString(), // find any indexed property larger ~3 hours ago
        //     //   '<': ''
        //     },
        //     // '-': 1, // filter in reverse
        //   };
            
        // logger.info(match)
        // @ts-ignore
        message_gun.get(groupId).map().once(async (data, key) => {
            // logger.info(data)
            // logger.info(key)
            // if(data) {
            //     if (previous <= count && count < existCount) {
            //         messages.push(data as MessageDocument)
            //     }
            // }
            // count++
            if(data){
                // if (previous <= count && count < existCount) {
                    // @ts-ignore
                    messages = [...messages.slice(-(existCount - 1)), data as MessageDocument].sort((a, b) => a.createTime - b.createTime);
                // }
            }
            // count++
            
        })
				
        await delay(3000)
        // if (existCount != 15){
        //     messages.slice()
        // }
        // console.log(existCount)
        if (previous> 0) {
            messages = [...messages.slice(-existCount, -previous )]
        }
        // logger.info("messages", messages.length)
        return messages
    },

    async get_one(uuid: string) {
        let message = {} as MessageDocument
        message_gun.get(uuid).on((data, key) => {
            message = data
        })
        return message
    },

    async create(message: MessageDocument, to: string = '') {
        message.uuid = uuid()
        message.deleted = false
        const index = new Date().toISOString()
        message.createTime = index
        if ( to != '') {
            message_gun.get(to).get(index).put(message)
        }
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