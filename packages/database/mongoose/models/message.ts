import { Schema, model, Document } from 'mongoose';
import Group from './group';
import User from './user';

const MessageSchema = new Schema({
    createTime: { type: Date, default: Date.now, index: true },

    from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    to: {
        type: String,
        index: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file', 'code', 'inviteV2', 'system'],
        default: 'text',
    },
    content: {
        type: String,
        default: '',
    },
    deleted: {
        type: Boolean,
        default: false,
    },
});

export interface MessageDocument extends Document {
    from: string;
    to: string; // if to group, the to is groupId. If private message, to is conbination of 2 users id.
    /** type, text, image, code, invite, system */
    type: string;
    content: string;
    createTime: Date;
    deleted: boolean;
}

/**
 * Message Model
 */
const Message = model<MessageDocument>('Message', MessageSchema);

export default Message;

interface SendMessageData {
    to: string;
    type: string;
    content: string;
}

export async function handleInviteV2Message(message: SendMessageData) {
    if (message.type === 'inviteV2') {
        const inviteInfo = JSON.parse(message.content);
        if (inviteInfo.inviter && inviteInfo.group) {
            const [user, group] = await Promise.all([
                User.findOne({ _id: inviteInfo.inviter }),
                Group.findOne({ _id: inviteInfo.group }),
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

export async function handleInviteV2Messages(messages: SendMessageData[]) {
    return Promise.all(
        messages.map(async (message) => {
            if (message.type === 'inviteV2') {
                await handleInviteV2Message(message);
            }
        }),
    );
}
