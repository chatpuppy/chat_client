/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import assert, { AssertionError } from 'assert';
import { Types } from '@chatpuppy/database/mongoose';
import { Expo, ExpoPushErrorTicket } from 'expo-server-sdk';

import xss from '@chatpuppy/utils/xss';
import logger from '@chatpuppy/utils/logger';
import User, { UserDocument } from '@chatpuppy/database/mongoose/models/user';
import Group, { GroupDocument } from '@chatpuppy/database/mongoose/models/group';
import Message, {
    handleInviteV2Message,
    handleInviteV2Messages,
    MessageDocument,
} from '@chatpuppy/database/mongoose/models/message';
import Notification from '@chatpuppy/database/mongoose/models/notification';
import History, {
    createOrUpdateHistory,
} from '@chatpuppy/database/mongoose/models/history';
import Socket from '@chatpuppy/database/mongoose/models/socket';

import {
    DisableSendMessageKey,
    DisableNewUserSendMessageKey,
    Redis,
} from '@chatpuppy/database/redis/initRedis';
import client from '../../../config/client';

const { isValid } = Types.ObjectId;

const FirstTimeMessagesCount = 15;
const EachFetchMessagesCount = 30;

const OneYear = 365 * 24 * 3600 * 1000;

const RPS = ['rock', 'scissors', 'paper'];

async function pushNotification(
    notificationTokens: string[],
    message: MessageDocument,
    groupName?: string,
) {
    const expo = new Expo({});

    const content =
        message.type === 'text' ? message.content : `[${message.type}]`;
    const pushMessages = notificationTokens.map((notificationToken) => ({
        to: notificationToken,
        sound: 'default',
        title: groupName || (message.from as any).username,
        body: groupName
            ? `${(message.from as any).username}: ${content}`
            : content,
        data: { focus: message.to },
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
    const disableSendMessage = await Redis.get(DisableSendMessageKey);
    assert(disableSendMessage !== 'true' || ctx.socket.isAdmin, 'Forbidden to send messages');

    const disableNewUserSendMessage = await Redis.get(
        DisableNewUserSendMessageKey,
    );
    if (disableNewUserSendMessage === 'true') {
        const user = await User.findById(ctx.socket.user);
        const isNewUser =
            user && user.createTime.getTime() > Date.now() - OneYear;
        assert(
            ctx.socket.isAdmin || !isNewUser,
            'New user are forbidden to send messages',
        );
    }

    const { to, content } = ctx.data;
    let { type } = ctx.data;
    assert(to, 'to cannot be empty');

    let toGroup: GroupDocument | null = null;
    let toUser: UserDocument | null = null;
    if (isValid(to)) {
        toGroup = await Group.findOne({ _id: to });
        assert(toGroup, 'Group not found');
    } else {
        const userId = to.replace(ctx.socket.user.toString(), '');
        assert(isValid(userId), 'Invalid user id');
        toUser = await User.findOne({ _id: userId });
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
        assert(file.size < client.maxFileSize, `File size too big, max: ${  client.maxFileSize}`);
        messageContent = content;
    } else if (type === 'inviteV2') {
        const shareTargetGroup = await Group.findOne({ _id: content });
        if (!shareTargetGroup) {
            throw new AssertionError({ message: 'Target group not found' });
        }
        const user = await User.findOne({ _id: ctx.socket.user });
        if (!user) {
            throw new AssertionError({ message: 'User not found' });
        }
        messageContent = JSON.stringify({
            inviter: user._id,
            group: shareTargetGroup._id,
        });
    }

    const user = await User.findOne(
        { _id: ctx.socket.user },
        { username: 1, avatar: 1, tag: 1 },
    );
    if (!user) {
        throw new AssertionError({ message: 'User not found' });
    }

    const message = await Message.create({
        from: ctx.socket.user,
        to,
        type,
        content: messageContent,
    } as MessageDocument);

    const messageData = {
        _id: message._id,
        createTime: message.createTime,
        from: user.toObject(),
        to,
        type,
        content: message.content,
    };
    if (type === 'inviteV2') {
        await handleInviteV2Message(messageData);
    }

    if (toGroup) {
        ctx.socket.emit(toGroup._id.toString(), 'message', messageData);

        const notifications = await Notification.find({
            user: {
                $in: toGroup.members,
            },
        });
        const notificationTokens: string[] = [];
        notifications.forEach((notification) => {
            // Messages sent by yourself don’t push notification to yourself
            if (
                notification.user._id.toString() === ctx.socket.user.toString()
            ) {
                return;
            }
            notificationTokens.push(notification.token);
        });
        if (notificationTokens.length) {
            pushNotification(
                notificationTokens,
                messageData as unknown as MessageDocument,
                toGroup.name,
            );
        }
    } else {
        const targetSockets = await Socket.find({ user: toUser?._id });
        const targetSocketIdList =
            targetSockets?.map((socket) => socket.id) || [];
        if (targetSocketIdList.length) {
            ctx.socket.emit(targetSocketIdList, 'message', messageData);
        }

        const selfSockets = await Socket.find({ user: ctx.socket.user });
        const selfSocketIdList = selfSockets?.map((socket) => socket.id) || [];
        if (selfSocketIdList.length) {
            ctx.socket.emit(selfSocketIdList, 'message', messageData);
        }

        const notificationTokens = await Notification.find({ user: toUser });
        if (notificationTokens.length) {
            pushNotification(
                notificationTokens.map(({ token }) => token),
                messageData as unknown as MessageDocument,
            );
        }
    }

    createOrUpdateHistory(ctx.socket.user.toString(), to, message._id);

    return messageData;
}

/**
 * Get latest history message
 * @param ctx Context
 */
export async function getLinkmansLastMessages(
    ctx: Context<{ linkmans: string[] }>,
) {
    const { linkmans } = ctx.data;
    assert(Array.isArray(linkmans), 'linkmans should be Array');

    const promises = linkmans.map(async (linkmanId) => {
        const messages = await Message.find(
            { to: linkmanId },
            {
                type: 1,
                content: 1,
                from: 1,
                createTime: 1,
                deleted: 1,
            },
            { sort: { createTime: -1 }, limit: FirstTimeMessagesCount },
        ).populate('from', { username: 1, avatar: 1, tag: 1 });
        await handleInviteV2Messages(messages);
        return messages;
    });
    const results = await Promise.all(promises);
    type Messages = {
        [linkmanId: string]: MessageDocument[];
    };
    const messages = linkmans.reduce((result: Messages, linkmanId, index) => {
        result[linkmanId] = (results[index] || []).reverse();
        return result;
    }, {});

    return messages;
}

export async function getLinkmansLastMessagesV2(
    ctx: Context<{ linkmans: string[] }>,
) {
    const { linkmans } = ctx.data;

    const histories = await History.find({
        user: ctx.socket.user.toString(),
        linkman: {
            $in: linkmans,
        },
    });
    const historyMap = histories
        .filter(Boolean)
        .reduce((result: { [linkman: string]: string }, history) => {
            result[history.linkman] = history.message;
            return result;
        }, {});

    const linkmansMessages = await Promise.all(
        linkmans.map(async (linkmanId) => {
            const messages = await Message.find(
                { to: linkmanId },
                {
                    type: 1,
                    content: 1,
                    from: 1,
                    createTime: 1,
                    deleted: 1,
                },
                {
                    sort: { createTime: -1 },
                    limit: historyMap[linkmanId] ? 100 : FirstTimeMessagesCount,
                },
            ).populate('from', { username: 1, avatar: 1, tag: 1 });
            await handleInviteV2Messages(messages);
            return messages;
        }),
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
                    ({ _id }) => _id.toString() === historyMap[linkmanId],
                );
                result[linkmanId] = {
                    messages: messages.slice(0, 15).reverse(),
                    unread: messageIndex === -1 ? 100 : messageIndex,
                };
            } else {
                result[linkmanId] = {
                    messages: messages.reverse(),
                    unread: 0,
                };
            }
            return result;
        },
        {},
    );

    return responseData;
}

/**
 * Get contract's history messages
 * @param ctx Context
 */
export async function getLinkmanHistoryMessages(
    ctx: Context<{ linkmanId: string; existCount: number }>,
) {
    const { linkmanId, existCount } = ctx.data;

    const messages = await Message.find(
        { to: linkmanId },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        {
            sort: { createTime: -1 },
            limit: EachFetchMessagesCount + existCount,
        },
    ).populate('from', { username: 1, avatar: 1, tag: 1 });
    await handleInviteV2Messages(messages);
    const result = messages.slice(existCount).reverse();
    return result;
}

/**
 * Get default group history messages
 * @param ctx Context
 */
export async function getDefaultGroupHistoryMessages(
    ctx: Context<{ existCount: number }>,
) {
    const { existCount } = ctx.data;

    const group = await Group.findOne({ isDefault: true });
    if (!group) {
        throw new AssertionError({ message: 'Default group not found' });
    }
    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        {
            sort: { createTime: -1 },
            limit: EachFetchMessagesCount + existCount,
        },
    ).populate('from', { username: 1, avatar: 1, tag: 1 });
    await handleInviteV2Messages(messages);
    const result = messages.slice(existCount).reverse();
    return result;
}

/**
 * Delete messages, only administrator
 */
export async function deleteMessage(ctx: Context<{ messageId: string }>) {
    assert(
        !client.disableDeleteMessage || ctx.socket.isAdmin,
        'Delete messages forbidden',
    );

    const { messageId } = ctx.data;
    assert(messageId, 'messageId can not be empty');

    const message = await Message.findOne({ _id: messageId });
    if (!message) {
        throw new AssertionError({ message: 'Message not found' });
    }
    assert(
        ctx.socket.isAdmin ||
            message.from.toString() === ctx.socket.user.toString(),
        'Only revoke owners messages',
    );

    if (ctx.socket.isAdmin) {
        await Message.deleteOne({ _id: messageId });
    } else {
        message.deleted = true;
        await message.save();
    }

    /**
     * Broadcasting deleting message
     */
    const messageName = 'deleteMessage';
    const messageData = {
        linkmanId: message.to.toString(),
        messageId,
        isAdmin: ctx.socket.isAdmin,
    };
    if (isValid(message.to)) {
        // Group messages
        ctx.socket.emit(message.to.toString(), messageName, messageData);
    } else {
        // Private messages
        const targetUserId = message.to.replace(ctx.socket.user.toString(), '');
        const targetSockets = await Socket.find({ user: targetUserId });
        const targetSocketIdList =
            targetSockets?.map((socket) => socket.id) || [];
        if (targetSocketIdList) {
            ctx.socket.emit(targetSocketIdList, messageName, messageData);
        }

        const selfSockets = await Socket.find({ user: ctx.socket.user });
        const selfSocketIdList = selfSockets?.map((socket) => socket.id) || [];
        if (selfSocketIdList) {
            ctx.socket.emit(
                selfSocketIdList.filter(
                    (socketId) => socketId !== ctx.socket.id,
                ),
                messageName,
                messageData,
            );
        }
    }

    return {
        msg: 'ok',
    };
}
