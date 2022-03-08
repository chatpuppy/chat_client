/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import assert, { AssertionError } from 'assert';
import { Expo, ExpoPushErrorTicket } from 'expo-server-sdk';

import xss from '@chatpuppy/utils/xss';
import logger from '@chatpuppy/utils/logger';
import Message, {
    MessageDocument,
    handleInviteV2Message,
    handleInviteV2Messages,
    handleInviteV2MessageModify
} from '@chatpuppy/database/gundb/models/message'
import User, { UserDocument} from '@chatpuppy/database/gundb/models/user'
import Group, { GroupDocument } from '@chatpuppy/database/gundb/models/group';
import Socket, { SocketDocument} from '@chatpuppy/database/gundb/models/socket';
import Notification from '@chatpuppy/database/gundb/models/notification';
import History, {createOrUpdateHistory} from '@chatpuppy/database/gundb/models/history'

import client from '../../../config/client';


/** Get the first number of historical messages. */
const FirstTimeMessagesCount = 15;
/** Number of historical messages obtained by calling the interface each time */
const EachFetchMessagesCount = 30;

const OneYear = 365 * 24 * 3600 * 1000;

const RPS = ['rock', 'scissors', 'paper'];

async function pushNotification(
    notificationTokens: string[],
    message: MessageDocument,
    groupName?: string
){
    const expo = new Expo({});
    const content = message.type === 'text' ? message.content : `[${message.type}]`;

    const pushMessages = notificationTokens.map((notificationToken) => ({
        to: notificationToken,
        sound: 'defaut',
        title: groupName || (message.from as any).username,
        body: groupName ? `${(message.from as any).username}: ${content}`: content,
        data: { focus: message.to }
    }));

    const chunks = expo.chunkPushNotifications(pushMessages as any);
    for (const chunk of chunks) {
        try {
            const results = await expo.sendPushNotificationsAsync(chunk);
            results.forEach((result) => {
                const { status, message: errMessage } =
                    result as ExpoPushErrorTicket;
                if (status === 'error') {
                    logger.warn('[Notification]', errMessage);
                }
            });
        } catch (error) {
            logger.error('[Notification]', (error as Error).message);
        }
    }
}

/**
 * Sending messages
 * If sending to group, to is group id
 * If sending to user, to is combination of 2 sorted userIds
 * @param ctx Context
 */
export async function sendMessage(ctx: Context<SendMessageData>) {
    const { to, content } = ctx.data;
    let { type } = ctx.data;
    assert(to, 'to cannot be empty');


    let toGroup: GroupDocument | null = null;
    let toUser: UserDocument | null = null;
    let uuid: string = '';
    if (to.length === 36) {
        toGroup = await Group.getGroupByUuid(to);
        uuid = toGroup.uuid
        assert(toGroup, 'Group not found');
    } else {
        const userId = to.replace(ctx.socket.user, '');
        assert(userId, 'Invalid user id');
        toUser = await User.get_one(userId)
        uuid = toUser.uuid
        assert(toUser, 'User not found');
    }

    let messageContent = content;
    if (type === 'text') {
        assert(messageContent.length <= 2048, 'Message length too long');

        const rollRegex = /^-roll( ([0-9]*))?$/;
        if (rollRegex.test(messageContent)) {
            const regexResult = rollRegex.exec(messageContent);
            if (regexResult) {
                let numberStr = regexResult[1] || '100';
                if (numberStr.length > 5) {
                    numberStr = '99999';
                }
                const number = parseInt(numberStr, 10);
                type = 'system';
                messageContent = JSON.stringify({
                    command: 'roll',
                    value: Math.floor(Math.random() * (number + 1)),
                    top: number,
                });
            }
        } else if (/^-rps$/.test(messageContent)) {
            type = 'system';
            messageContent = JSON.stringify({
                command: 'rps',
                value: RPS[Math.floor(Math.random() * RPS.length)],
            });
        }
        messageContent = xss(messageContent);
    } else if (type === 'file') {
        const file: { size: number } = JSON.parse(content);
        assert(file.size < client.maxFileSize, 'File size too big, max');
        messageContent = content;
    } else if (type === 'inviteV2') {
        const shareTargetGroup = await Group.get(content);
        if (!shareTargetGroup) {
            throw new AssertionError({ message: 'Target group not found' });
        }
        const user = await User.get_one(ctx.socket.user);
        if (!user) {
            throw new AssertionError({ message: 'User not found' });
        }
        messageContent = JSON.stringify({
            inviter: user.uuid,
            group: shareTargetGroup.uuid,
        });
    }
    const user = await User.get_one(ctx.socket.user);
    if (!user) {
        throw new AssertionError({ message: '用户不存在' });
    }
    const message = await Message.create({
        from: ctx.socket.user,
        to,
        type,
        content: messageContent,
        createTime: new Date().toLocaleString()
    } as MessageDocument);

    const messageData = {
        _id: message.uuid,
        createTime: message.createTime,
        from: user,
        to,
        type,
        content: message.content
    };

    if (type === 'inviteV2') {
        await handleInviteV2MessageModify(messageData);
    }

    if (toGroup) {
        ctx.socket.emit(toGroup.uuid, 'message', messageData);
        const notifications = await Notification.get(toGroup.members);
        const notificationTokens: string[] = [];
        notifications.forEach((notification) => {
            // Messages sent by yourself don’t push notification to yourself
            if (
                notification.user === ctx.socket.user
            ) {
                return;
            }
            notificationTokens.push(notification.token);
        });
        if (notificationTokens.length) {
            await pushNotification(
                notificationTokens,
                messageData as unknown as MessageDocument,
                toGroup.name,
            );
        }
    } else {
        const targetSockets = await Socket.getOneUser(toUser?.uuid);
        const targetSocketIdList =
            targetSockets?.map((socket) => socket.id) || [];
        if (targetSocketIdList.length) {
            ctx.socket.emit(targetSocketIdList, 'message', messageData);
        }

        const selfSockets = await Socket.getOneUser(ctx.socket.user);
        const selfSocketIdList = selfSockets?.map((socket) => socket.id) || [];
        if (selfSocketIdList.length) {
            ctx.socket.emit(selfSocketIdList, 'message', messageData);
        }

        const notificationTokens = await Notification.get_by_user(uuid);
        if (notificationTokens.length) {
            pushNotification(
                notificationTokens.map(({ token }) => token),
                messageData as unknown as MessageDocument,
            );
        }
    }

    await createOrUpdateHistory(ctx.socket.user, to, message.uuid);
    return messageData;

}


export async function getLinkmansLastMessagesV2(
    ctx: Context<{linkmans: string[]}>
) {
    const { linkmans } = ctx.data;
    const histories = await History.getLinkMans(ctx.socket.user, linkmans);

    const historyMap = histories
        .filter(Boolean)
        .reduce((result: { [linkman: string]: string }, history) => {
            result[history.linkman] = history.message;
            return result
        }, {})
    const linkmansMessages = await Promise.all(
        linkmans.map(async (linkmanId) => {
            let messages = await Message.getToGroup(linkmanId)
            messages = await User.getUserMessage(messages)
            messages.sort((a,b) =>  new Date(a.createTime).getTime() - new Date(b.createTime).getTime() )
            await handleInviteV2Messages(messages)
            return messages
        })   
    );

    type ResponseData = {
        [linkmanId: string]: {
            messages: MessageDocument[];
            unread: number;
        };
    };

    const responseData = linkmans.reduce(
        (result: ResponseData, linkmanId, index) => {
            const messages = linkmansMessages[index];
            if (historyMap[linkmanId]) {
                const messageIndex = messages.findIndex(
                    ({uuid}) => uuid === historyMap[linkmanId]
                );
                result[linkmanId] = {
                    messages,
                    unread: messageIndex === -1 ? 100: messageIndex
                };
            } else {
                result[linkmanId] = {
                    messages,
                    unread: 0
                }
            }
            return result;
        },
        {},
    );
    return responseData
}

/**
 * 获取默认群组的历史消息
 * @param ctx Context
 */

export async function getDefaultGroupHistoryMessages(
    ctx: Context<{existCount: number}>,
) {
    const { existCount } = ctx.data;
    const group = await Group.getDefaultGroup();
    if (Object.keys(group).length === 0) {
        throw new AssertionError({ message: '默认群组不存在' });
    }
    const messages = await Message.getToGroup(group.uuid)
    await handleInviteV2Messages(messages);
    const result = messages.slice(existCount).reverse();
    return result;
}

/**
 * 获取联系人的历史消息
 * @param ctx Context
 */
export async function getLinkmanHistoryMessages(
    ctx: Context<{ linkmanId: string; existCount: number }>,

) {
    const { linkmanId, existCount } = ctx.data;
    let messages = await Message.getToGroup(linkmanId)
    messages = await User.getUserMessage(messages)
    await handleInviteV2Messages(messages);
    const result = messages.slice(existCount).reverse();
    return result;
}