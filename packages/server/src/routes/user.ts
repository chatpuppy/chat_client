// @ts-ignore

import assert, { AssertionError } from 'assert';
import jwt from 'jwt-simple';
import config from '@chatpuppy/config/server';
import User, { UserDocument} from '@chatpuppy/database/gundb/models/user'

import Message, {
    handleInviteV2Messages,
} from '@chatpuppy/database/gundb/models/message';

import Group, { GroupDocument } from '@chatpuppy/database/gundb/models/group';
import Friend, {FriendDocument} from '@chatpuppy/database/gundb/models/friend'
import Socket, { SocketDocument } from '@chatpuppy/database/gundb/models/socket';

import logger from '@chatpuppy/utils/logger';
import Notification from '@chatpuppy/database/gundb/models/notification';



interface Environment {
    os: string;
    browser: string;
    environment: string;
}

export async function register(
    ctx: Context<{address: string, avatar: string} & Environment>
) {
    const { address, os, browser, environment, avatar } = ctx.data;

    const defaultGroup = await Group.getDefaultGroup()


    if (!defaultGroup) {
        // TODO: refactor when node types support "Assertion Functions" https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
        throw new AssertionError({ message: 'Default group is not exist' });
    }
    let newUser = await User.auth(address);
    let is_new = false;
    console.log("Auth", newUser)
    if (Object.keys(newUser).length == 0) {
        try {
            newUser = {
                address,
                avatar: avatar,
                lastLoginIp: ctx.socket.ip
            } as UserDocument;
            newUser = await User.createUser(newUser);
            logger.info("newUser", newUser)
            is_new = true
        } catch (err) {
            if ((err as Error).name === 'ValifationError') {
                return 'User name contains unsupported characters or its length exceeds the limit.';
            }
            throw err;
        }
    }
    let groups = []
    if (is_new) {
        defaultGroup.members = `${defaultGroup.members  },${  newUser.uuid}`
        logger.info("test1")
        await Group.save(defaultGroup)
        logger.info("test2")
        groups.push(defaultGroup)
    }
    else {
        logger.info("test3")
        groups = await Group.getGroupByMember(newUser)
        logger.info("test4")
    }
    // eslint-disable-next-line no-use-before-define
    const token = generateToken(newUser.address, environment);

    ctx.socket.user = newUser.uuid;
    logger.info("test5")
    const friends = await Friend.getByFrom(newUser.uuid)
    logger.info("test6")
    let currentFriends = [] as any
    if (friends.length > 0){
        logger.info("test7")
        currentFriends = await User.getDataByFriend(friends)
        logger.info("test8")
    }else {
        currentFriends = []
    }

    logger.info("test9")
    const socket = await Socket.getOne(ctx.socket.id)
    logger.info("test10")
    socket.user = newUser.uuid
    socket.os = os
    socket.browser = browser
    socket.environment = environment
    logger.info("test11")
    await Socket.create(socket)
    logger.info("test12")

    const data = {
        _id: newUser.uuid,
        avatar: newUser.avatar,
        address: newUser.address,
        username: newUser.username,
        groups,
        friends: currentFriends,
        token,
        isAdmin: false,
        notificationTokens: [],
    };
    return data
}

/**
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
        throw new AssertionError({ message: 'Default group is not exist' });
    }


    ctx.socket.join(defaultGroup._id);
    let  messages = await Message.getToGroup(defaultGroup.uuid);
    // messages.sort((a, b)=> (new Date(a.createTime).getTime() >  new Date(b.createTime).getTime()) ? -1 : 1)

    messages = await User.getUserMessage(messages)
    messages.sort((a,b) =>  (new Date(a.createTime).getTime() < new Date(b.createTime).getTime()) ? -1 : 1 )
    await handleInviteV2Messages(messages);
    const data = { messages, ...defaultGroup }
    return data;
}

/**
 * @param user
 * @param environment
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
 * @param ctx Context
 */
export async function login(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username can not be empty');
    assert(password, 'Password can not be empty');
    const user = await User.auth(username)

    if (Object.keys(user).length === 0) {
        throw new AssertionError({ message: 'User not exist' });
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
 * @param ctx Context
 */
export async function loginByToken(
    ctx: Context<{ token: string } & Environment>,
) {
    const { token, os, browser, environment } = ctx.data;
    assert(token, 'token can not be empty');

    let payload = null;

    try {
        payload = jwt.decode(token, config.jwtSecret);
    } catch (err) {
        return 'Inavailable token';
    }
    assert(Date.now() < payload.expires, 'token timeout');
    assert.equal(environment, payload.environment, 'Illegal login');


    const user = await User.auth(payload.user)

    if (Object.keys(user).length === 0) {
        throw new AssertionError({ message: 'User not exist' });
    }


    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;


    const groups = await Group.getGroupByMember(user)
    logger.info("groups", groups)
    // groups.forEach((group: GroupDocument) => {
    //     ctx.socket.join(group._id);
    // });
    for (let i = 0; i < groups.length; i++) {
        ctx.socket.join(groups[i]._id);
    }

    logger.info(user)

    ctx.socket.user = user.uuid;

    const socket = await Socket.update({
        id: ctx.socket.id,
        user: user.uuid,
        os,
        browser,
        environment,
        ip: ctx.socket.ip
    } as SocketDocument)
    logger.info(socket)
    const friends = await Friend.getByFrom(user.uuid)
    let currentFriends = [] as any
    if (friends.length > 0){
        currentFriends = await User.getDataByFriend(friends)
    }else {
        currentFriends = []
    }
    // eslint-disable-next-line no-use-before-define
    const notificationTokens = await getUserNotificationTokens(user);
    logger.info(friends)
    const  data = {
        _id: user.uuid,
        avatar: user.avatar,
        username: user.username,
        address: user.address,
        tag: user.tag,
        groups,
        friends: currentFriends,
        isAdmin: config.administrator.includes(user.uuid),
        notificationTokens: []
    }

    return data
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
export async function changeAvatar(ctx: Context<{ avatar: string, address: string }>) {
    const { avatar, address } = ctx.data;
    assert(avatar, 'Url of avatar cannot be empty');

    const user = {
        uuid: ctx.socket.user,
        avatar,
        address
    } as UserDocument

    await User.saveAvatarByName(user)
    return {};
}

/**
 * @param ctx Context
 */
export async function changeUsername(ctx: Context<{ username: string, address: string }>) {
    const {username, address} = ctx.data;
    assert(username, 'New username can not be empty');
    const user = {
        uuid: ctx.socket.user,
        username,
        address
    } as UserDocument
    await User.saveUsername(user)
    return {
        msg: 'ok',
    };
}

/**
 * @param ctx Context
 */
export async function addFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(ctx.socket.user !== userId, 'Can add yourself');


    const user = await User.get_one(userId)
    const friend = await Friend.get(ctx.socket.user, user.uuid);
    assert(friend.length === 0, 'Your have added already');



    const newFriend = await Friend.addFriend({
        from: ctx.socket.user ,
        to: user.uuid,
        createTime: new Date().toString(),
        nickname: '',
    } as FriendDocument);

    return {
        _id: newFriend.uuid,
        username: user.username,
        avatar: user.avatar,
        from: newFriend.from,
        to: newFriend.to,
        nickname: '',
    };
}

export async function changeNameBuddy(ctx: Context<{userId: string, friendId: string, nickname: string}>) {
    const {userId, friendId, nickname} = ctx.data

    await Friend.changeName(friendId, nickname, ctx.socket.user)
    return {
        msg: 'ok'
    }
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
        assert(userId, 'userId can not be empty');

        if (cache[userId] && cache[userId].expireTime > Date.now()) {
            return {
                isOnline: cache[userId].value,
            };
        }
        // const friend = await Friend.getUuid(userId)
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