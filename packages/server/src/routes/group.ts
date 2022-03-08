import assert, { AssertionError } from 'assert';

import config from '@chatpuppy/config/server';
import getRandomAvatar from '@chatpuppy/utils/getRandomAvatar';
import Group, { GroupDocument } from '@chatpuppy/database/gundb/models/group';
import Message from '@chatpuppy/database/gundb/models/message';
import Socket from '@chatpuppy/database/gundb/models/socket'
import User from '@chatpuppy/database/gundb/models/user';

/**
 * 获取指定群组的在线用户辅助方法
 * @param group 
 */
async function getGroupOnlineMembersHelper(group: GroupDocument) {
    const sockets = await Socket.getAllMembers(group.members)
    const filterSockets = sockets.reduce(
        (result, socket) => {
            result.set(socket.user, socket);
            return result

        }, new Map())
    return Array.from(filterSockets.values());
}


/**
 * Create group
 * @param ctx Context
 */
export async function createGroup(ctx: Context<{ name: string }>) {
    assert(!config.disableCreateGroup, 'Creating group is closed');

    const ownGroupCount = await Group.countGroup(ctx.socket.user)
    assert(
        ctx.socket.isAdmin || ownGroupCount < config.maxGroupsCount,
        `Create group fail, you have created ${config.maxGroupsCount} groups`,
    );

    const { name } = ctx.data;
    assert(name, 'Group name cannot be empty');

    const group = await Group.checkName(name);
    assert(!group, 'Group is exist')

    let newGroup = {} as GroupDocument;
    try {
        newGroup = await Group.createGroup({
            name,
            avatar: getRandomAvatar(),
            creator: ctx.socket.user,
            members: ctx.socket.user,
            createTime: new Date().toString()
        } as GroupDocument)

    } catch (err) {
        if (err.name === 'ValidationError') {
            return 'Group name includes unsupported characters, or too long';
        }
        throw err;
    }

    ctx.socket.join(newGroup.uuid)
    return  {
        _id: newGroup.uuid,
        name: newGroup.name,
        avatar: newGroup.avatar,
        createTime: newGroup.createTime,
        creator: newGroup.creator,
    };

}



const GroupOnlineMembersCacheExpireTime = 1000 * 60;
/**
 * 获取群组在线成员
 */
function getGroupOnlineMembersWrapperV2() {
    const cache: Record<
        string,
        {
            key?: string;
            value: any;
            expireTime: number
        }
    > = {};
    return async function getGroupOnlineMembersV2(
        ctx: Context<{groupId: string; cache?: string}>
    ) {
        const { groupId, cache: cacheKey} = ctx.data;

        if (
            cache[groupId] &&
            cache[groupId].key === cacheKey &&
            cache[groupId].expireTime > Date.now()
        ) {
            return { cache: cacheKey };
        }

        const group = await Group.getGroupByUuid(groupId);
        if (Object.keys(group).length === 0) {
            throw new AssertionError({message: 'Group is not found'})
        }
        const result = await getGroupOnlineMembersHelper(group);
        return result
    }
}

export const getGroupOnlineMembersV2 = getGroupOnlineMembersWrapperV2();

/**
 * 获取默认群组的在线成员
 * 无需登录态
 */

function getDefaultGroupOnlineMembersWrapper() {
    let cache: any = null;
    let expireTime = 0;
    return async function getDefaultGroupOnlineMembers() {
        if (cache && expireTime > Date.now()) {
            return cache;
        }

        const group = await Group.getDefaultGroup()

        if (Object.keys(group).length === 0) {
            throw new AssertionError({ message: 'Group is not found' });
        }
        cache = await getGroupOnlineMembersHelper(group);
        expireTime = Date.now() + GroupOnlineMembersCacheExpireTime;
        return cache;
    }
}

export const getDefaultGroupOnlineMembers = getDefaultGroupOnlineMembersWrapper();

export async function getGroupBasicInfo(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(groupId, 'Invalid group ID');
    const group = await Group.getGroupByUuid(groupId);

    if (Object.keys(group).length === 0) {
        throw new AssertionError({ message: 'Group is not found' });
    }
    return {
        _id: group.uuid,
        name: group.name,
        avatar: group.avatar,
        members: group.members.length,
    };
}

/**
 * 加入群组
 * @param ctx Context
 */
export async function joinGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(groupId, 'Invalid group ID');

    const group = await Group.getGroupByUuid(groupId);
    if (!group) {
        throw new AssertionError({ message: 'Join group fail, group is not found' });
    }
    const members = group.members.split(",")
    assert(members.indexOf(ctx.socket.user) === -1, 'You are in the group already')
    group.members = `${group.members  },${  ctx.socket.user}`

    await Group.save(group)

    let messages = await Message.getToGroup(group.uuid)
    messages = await User.getUserMessage(messages)

    ctx.socket.join(group.uuid)
    return {
        _id: group.uuid,
        name: group.name,
        avatar: group.avatar,
        createTime: group.createTime,
        creator: group.creator,
        messages
    }



}