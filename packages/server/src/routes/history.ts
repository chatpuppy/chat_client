import { isValidObjectId, Types } from '@chatpuppy/database/mongoose';
import assert from 'assert';
import User from '@chatpuppy/database/mongoose/models/user';
import Group from '@chatpuppy/database/mongoose/models/group';
import Message from '@chatpuppy/database/mongoose/models/message';
import { createOrUpdateHistory } from '@chatpuppy/database/mongoose/models/history';

export async function updateHistory(
    ctx: Context<{ userId: string; linkmanId: string; messageId: string }>,
) {
    const { linkmanId, messageId } = ctx.data;
    const self = ctx.socket.user.toString();
    if (!Types.ObjectId.isValid(messageId)) {
        return {
            msg: `not update with invalid messageId:${messageId}`,
        };
    }

    // @ts-ignore
    const [user, linkman, message] = await Promise.all([
        User.findOne({ _id: self }),
        isValidObjectId(linkmanId)
            ? Group.findOne({ _id: linkmanId })
            : User.findOne({ _id: linkmanId.replace(self, '') }),
        Message.findOne({ _id: messageId }),
    ]);
    assert(user, 'User not found');
    assert(linkman, 'Contract not found');
    assert(message, 'Message not found');

    await createOrUpdateHistory(self, linkmanId, messageId);

    return {
        msg: 'ok',
    };
}
