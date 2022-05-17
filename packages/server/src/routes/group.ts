import assert, { AssertionError } from 'assert';

import config from '@chatpuppy/config/server';
import getRandomAvatar from '@chatpuppy/utils/getRandomAvatar';
import logger from '@chatpuppy/utils/logger';
import Group, { GroupDocument } from '@chatpuppy/database/gundb/models/group';
import Message from '@chatpuppy/database/gundb/models/message';
import Socket from '@chatpuppy/database/gundb/models/socket'
import User from '@chatpuppy/database/gundb/models/user';

/**
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
    logger.info(ctx.data)
    const ownGroupCount = await Group.countGroup(ctx.socket.user)
    assert(
        ctx.socket.isAdmin || ownGroupCount < config.maxGroupsCount,
        `Create group fail, you have created ${config.maxGroupsCount} groups`,
    );

    const { name } = ctx.data;
    assert(name, 'Group name cannot be empty');

    const group = await Group.checkName(name);
    logger.info("group", group)
    assert(!group, 'Group is exist')

    let newGroup = {} as GroupDocument;
    const user = await User.get_one(ctx.socket.user)
    try {
        newGroup = await Group.createGroup({
            name,
            avatar: user.avatar,
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
 * 
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

    let messages = await Message.getToGroup(group.uuid,0)
		console.log("joinGroup total messages:", messages.length)
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

// export async function updateGroup(ctx: Context<{ name: string, avatar: string}>) {
//     const { name, avatar} = ctx.data
//     assert(name, 'Invalid group name')
//
//     await Group.saveGroup(name, avatar)
//     return {
//         msg: 'ok'
//     }
// }

/**
 * Update group name, only group creater can update it
 * @param ctx Context
 */
 export async function changeGroupName(
    ctx: Context<{ old_name: string; name: string }>,
) {
    logger.info(ctx.data)
    const {old_name, name} = ctx.data
    assert(name, 'Group name cannot be empty');

    const group = await Group.getGroup(old_name)
    if (Object.keys(group).length == 0) {
        throw new AssertionError({ message: 'Group is not found' });
    }
    assert(old_name !== name, 'New group name cannot be same as before');
    assert(
        group.creator === ctx.socket.user,
        'Only creator can update the group avatar',
    );
    
    const groupId = await Group.updateName(group, name)

    ctx.socket.emit(groupId, 'changeGroupName', { groupId, name });

    return {
        msg: 'ok'
    }
}

/**
 * Update group avatar, only group creater can update it
 * @param ctx Context
 */
 export async function changeGroupAvatar(
    ctx: Context<{ name: string; avatar: string }>,
) {
    const { name, avatar} = ctx.data
    assert(name, 'Invalid group name')
    logger.info(ctx.data)
    const group = await Group.getGroup(name)
    await Group.saveGroup(group, avatar)
    return {
        msg: 'ok'
    }
}