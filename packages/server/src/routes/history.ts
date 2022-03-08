import assert from 'assert';
import User from '@chatpuppy/database/gundb/models/user';
import Group from '@chatpuppy/database/gundb/models/group';
import Message from '@chatpuppy/database/gundb/models/message';
import { createOrUpdateHistory } from '@chatpuppy/database/gundb/models/history';
import logger from '@chatpuppy/utils/logger';


export async function updateHistory(
    ctx: Context<{userId: string, linkmanId: string, messageId: string}>
) {
    const { linkmanId, messageId } = ctx.data;
    const self = ctx.socket.user.toString();

    // @ts-ignore
    const [user, linkman, message] = await Promise.all([
        User.get_one(self),
        linkmanId,
        Message.get_one(messageId),
    ]);

    assert(user, 'User not found');
    assert(linkman, 'Contract not found');
    assert(message, 'Message not found');

    await createOrUpdateHistory(self, linkmanId, messageId);

    return {
        msg: 'ok',
    };
}