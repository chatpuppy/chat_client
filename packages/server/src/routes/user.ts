// @ts-ignore

import assert, { AssertionError } from 'assert';
import jwt from 'jwt-simple';
import config from '@chatpuppy/config/server';
import User, { UserDocument} from '@chatpuppy/database/gundb/models/user'
import getRandomAvatar from '@chatpuppy/utils/getRandomAvatar';

import Message, {
    handleInviteV2Messages,
} from '@chatpuppy/database/gundb/models/message';

import Group, { GroupDocument } from '@chatpuppy/database/gundb/models/group';
import Friend, {FriendDocument} from '@chatpuppy/database/gundb/models/friend'
import Socket, { SocketDocument } from '@chatpuppy/database/gundb/models/socket';

import logger from '@chatpuppy/utils/logger';
import Notification from '@chatpuppy/database/gundb/models/notification';
import { getSocketIp } from '@chatpuppy/utils/socket';


const OneDay = 1000 * 60 * 60 * 24;

interface Environment {
    os: string;
    browser: string;
    environment: string;
}

export async function register(
    ctx: Context<{username: string, password: string} & Environment>
) {
    assert(!config.disableRegister, '注册功能已被禁用, 请联系管理员开通账号');
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, '用户名不能为空');
    assert(password, '密码不能为空');

    const defaultGroup = await Group.getDefaultGroup()


    if (!defaultGroup) {
        // TODO: refactor when node types support "Assertion Functions" https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
        throw new AssertionError({ message: '默认群组不存在' });
    }

    let newUser = null;
    try {
        newUser = {
            username,
            password,
            avatar: getRandomAvatar(),
            lastLoginIp: ctx.socket.ip
        };
        
        newUser = await User.createUser(newUser as UserDocument);
    } catch (err) {
        if ((err as Error).name === 'ValifationError') {
            return '用户名包含不支持的字符或者长度超过限制';
        }
        throw err;
    }
    defaultGroup.members = `${defaultGroup.members  },${  newUser.uuid}`
    await Group.save(defaultGroup)
    // eslint-disable-next-line no-use-before-define
    const token = generateToken(newUser.uuid, environment);

    ctx.socket.user = newUser.uuid;

    const socket = await Socket.getOne(ctx.socket.id)
    socket.user = newUser.uuid
    socket.os = os
    socket.browser = browser
    socket.environment = environment
    await Socket.create(socket)


    const data = {
        _id: newUser.uuid,
        avatar: newUser.avatar,
        username: newUser.username,
        groups: [
            {
                _id: defaultGroup.uuid,
                name: defaultGroup.name,
                avatar: defaultGroup.avatar,
                creator: defaultGroup.creator,
                createTime: defaultGroup.createTime,
                messages: [],
            },
        ],
        friends: [],
        token,
        isAdmin: false,
        notificationTokens: [],
    };
    return data
}

/**
 * 游客登录, 只能获取默认群组信息
 * @param ctx Context
 */
export async function guest(ctx: Context<Environment>) {
    const { os, browser, environment } = ctx.data;

    // await Socket.updateOne(
    //     { id: ctx.socket.id },
    //     {
    //         os,
    //         browser,
    //         environment,
    //     },
    // );

    const defaultGroup = await Group.getDefaultGroup();

    if (Object.keys(defaultGroup).length === 0) {
        throw new AssertionError({ message: '默认群组不存在' });
    }


    ctx.socket.join(defaultGroup._id);
    let  messages = await Message.getToGroup(defaultGroup.uuid);
    messages = await User.getUserMessage(messages)
    await handleInviteV2Messages(messages);

    return { messages, ...defaultGroup };
}

/**
 * 生成jwt token
 * @param user 用户
 * @param environment 客户端环境信息
 */
function generateToken(user: string, environment: string) {
    return jwt.encode(
        {
            user,
            environment,
            expires: Date.now() + config.tokenExpiresTime,
        },
        config.jwtSecret,
    );
}


/**
 * 账密登录
 * @param ctx Context
 */
export async function login(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, '用户名不能为空');
    assert(password, '密码不能为空');
    const user = await User.auth(username, password)

    if (Object.keys(user).length === 0) {
        throw new AssertionError({ message: '该用户不存在' });
    }

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    // user = await User.save(user)
    const groups = await Group.getGroupByMember(user)


    if (groups.length > 0){
        groups.forEach((group) => {
            ctx.socket.join(group.uuid);
        });
    }

    const token = generateToken(user.uuid, environment);

    ctx.socket.user = user.uuid;

    // eslint-disable-next-line no-use-before-define
    // const notificationTokens = await getUserNotificationTokens(user);
    const friends = [] as Array<FriendDocument>

    await Socket.update({
        id: ctx.socket.id,
        user: user.uuid,
        os,
        browser,
        environment,
        ip: ctx.socket.ip
    } as SocketDocument)

    return {
        _id: user.uuid,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        token,
        isAdmin: config.administrator.includes(user.uuid),
        notificationTokens: [],
    };
}
/**
 * token登录
 * @param ctx Context
 */
export async function loginByToken(
    ctx: Context<{ token: string } & Environment>,
) {
    const { token, os, browser, environment } = ctx.data;
    assert(token, 'token不能为空');

    let payload = null;
    try {
        payload = jwt.decode(token, config.jwtSecret);
    } catch (err) {
        return '非法token';
    }

    assert(Date.now() < payload.expires, 'token已过期');
    assert.equal(environment, payload.environment, '非法登录');

    const user = await User.get_one(payload.user)

    if (!user) {
        throw new AssertionError({ message: '用户不存在' });
    }


    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;


    const groups = await Group.getGroupByMember(user)

    groups.forEach((group: GroupDocument) => {
        group._id = group.uuid;
        ctx.socket.join(group._id);
    });

    ctx.socket.user = user.uuid;

    const socket = await Socket.update({
        id: ctx.socket.id,
        user: user.uuid,
        os,
        browser,
        environment,
        ip: ctx.socket.ip
    } as SocketDocument)

    const friends = await Friend.getByFrom(user.uuid)
    let currentFriends = [] as any
    if (friends.length > 0){
        currentFriends = await User.getDataByFriend(friends)
    }else {
        currentFriends = []
    }


    // eslint-disable-next-line no-use-before-define
    const notificationTokens = await getUserNotificationTokens(user);
    return {
        _id: user.uuid,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends: currentFriends,
        isAdmin: config.administrator.includes(user.uuid),
        notificationTokens: []
    }
}

async function getUserNotificationTokens(user: UserDocument) {
    // const notifications = (await Notification.find({ user })) || [];
    const notifications = await  Notification.get_by_user(user.uuid)
    return notifications.map(({ token }) => token);
}


/**
 * 修改用户头像
 * @param ctx Context
 */
export async function changeAvatar(ctx: Context<{ avatar: string }>) {
    const { avatar } = ctx.data;
    assert(avatar, '新头像链接不能为空');

    const user = {
        uuid: ctx.socket.user,
        avatar
    } as UserDocument

    await User.saveAvatarByName(user)

    // await User.updateOne(
    //     { _id: ctx.socket.user },
    //     {
    //         avatar,
    //     },
    // );

    return {};
}

/**
 * 添加好友, 单向添加
 * @param ctx Context
 */
export async function addFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(ctx.socket.user !== userId, '不能添加自己为好友');


    const user = await User.get_one(userId)
    const friend = await Friend.get(ctx.socket.user, user.uuid);
    assert(friend.length === 0, '你们已经是好友了');



    const newFriend = await Friend.addFriend({
        from: ctx.socket.user ,
        to: user.uuid,
        createTime: new Date().toString()
    } as FriendDocument);

    return {
        _id: user.uuid,
        username: user.username,
        avatar: user.avatar,
        from: newFriend.from,
        to: newFriend.to,
    };
}

const UserOnlineStatusCacheExpireTime = 1000 * 60;
function getUserOnlineStatusWrapper() {
    const cache: Record<string,
        {
            value: boolean;
            expireTime: number;
        }> = {};
    return async function getUserOnlineStatus(
        ctx: Context<{ userId: string }>,
    ) {
        const { userId } = ctx.data;
        assert(userId, 'userId不能为空');

        if (cache[userId] && cache[userId].expireTime > Date.now()) {
            return {
                isOnline: cache[userId].value,
            };
        }
        const sockets = await Socket.getOneUser(userId)
        const isOnline = sockets.length > 0;
        cache[userId] = {
            value: isOnline,
            expireTime: Date.now() + UserOnlineStatusCacheExpireTime,
        };
        return {
            isOnline,
        };
    };
}

export const getUserOnlineStatus = getUserOnlineStatusWrapper();