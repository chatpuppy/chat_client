import fs from 'fs';
import path from 'path';
import axios from 'axios';
import assert, { AssertionError } from 'assert';
import { promisify } from 'util';
import RegexEscape from 'regex-escape';
import OSS, { STS } from 'ali-oss';

import config from '@chatpuppy/config/server';
import logger from '@chatpuppy/utils/logger';
import User from '@chatpuppy/database/mongoose/models/user';
import Group from '@chatpuppy/database/mongoose/models/group';

import Socket from '@chatpuppy/database/mongoose/models/socket';
import {
    getAllSealIp,
    getAllSealUser,
    getSealIpKey,
    getSealUserKey,
    DisableSendMessageKey,
    DisableNewUserSendMessageKey,
    Redis,
} from '@chatpuppy/database/redis/initRedis';

/** Baidu void token */
let baiduToken = '';

let lastBaiduTokenTime = Date.now();

/**
 * Search group and user
 * @param ctx Context
 */
export async function search(ctx: Context<{ keywords: string }>) {
    const keywords = ctx.data.keywords?.trim() || '';
    if (keywords === '') {
        return {
            users: [],
            groups: [],
        };
    }

    const escapedKeywords = RegexEscape(keywords);
    const users = await User.find(
        { username: { $regex: escapedKeywords } },
        { avatar: 1, username: 1 },
    );
    const groups = await Group.find(
        { name: { $regex: escapedKeywords } },
        { avatar: 1, name: 1, members: 1 },
    );

    return {
        users,
        groups: groups.map((group) => ({
            _id: group._id,
            avatar: group.avatar,
            name: group.name,
            members: group.members.length,
        })),
    };
}

/**
 * Search memes
 * @param ctx Context
 */
export async function searchExpression(
    ctx: Context<{ keywords: string; limit?: number }>,
) {
    const { keywords, limit = Infinity } = ctx.data;
    if (keywords === '') {
        return [];
    }

    const res = await axios({
        method: 'get',
        url: `https://pic.sogou.com/pics/json.jsp?query=${encodeURIComponent(
            `${keywords} meme`,
        )}&st=5&start=0&xml_len=60&callback=callback&reqFrom=wap_result&`,
        headers: {
            accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            referrer: `https://pic.sogou.com/pic/emo/searchList.jsp?statref=search_form&uID=hTHHybkSPt37C46z&spver=0&rcer=&keyword=${encodeURIComponent(
                keywords,
            )}`,
            referrerPolicy: 'no-referrer-when-downgrade',
            'user-agent':
                'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        },
    });
    assert(res.status === 200, 'Search memes failed');

    try {
        const parseDataResult = res.data.match(/callback\((.+)\)/);
        const data = JSON.parse(`${parseDataResult[1]}`);

        type Image = {
            locImageLink: string;
            width: number;
            height: number;
        };
        const images = data.items as Image[];
        return images
            .map(({ locImageLink, width, height }) => ({
                image: locImageLink,
                width,
                height,
            }))
            .filter((image, index) =>
                limit === Infinity ? true : index < limit,
            );
    } catch (err) {
        assert(false, 'Search memes failed, data parsing error');
    }

    return [];
}

/**
 * Getting baidu voice token
 */
export async function getBaiduToken() {
    if (baiduToken && Date.now() < lastBaiduTokenTime) {
        return { token: baiduToken };
    }

    const res = await axios.get(
        'https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=pw152BzvaSZVwrUf3Z2OHXM6&client_secret=fa273cc704b080e85ad61719abbf7794',
    );
    assert(res.status === 200, 'Request baidu token failed');

    baiduToken = res.data.access_token;
    lastBaiduTokenTime =
        Date.now() + (res.data.expires_in - 60 * 60 * 24) * 1000;
    return { token: baiduToken };
}

/**
 * Forbidden user, only administrator
 * @param ctx Context
 */
export async function sealUser(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', 'Usernamce can not be empty');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'User not found' });
    }

    const userId = user._id.toString();
    const isSealUser = await Redis.has(getSealUserKey(userId));
    assert(!isSealUser, 'User is forbidden');

    await Redis.set(getSealUserKey(userId), userId, Redis.Minute * 10);

    return {
        msg: 'ok',
    };
}

/**
 * Get banned list, including banned user and banned IP, only administrator
 */
export async function getSealList() {
    const sealUserList = await getAllSealUser();
    const sealIpList = await getAllSealIp();
    const users = await User.find({ _id: { $in: sealUserList } });

    const result = {
        users: users.map((user) => user.username),
        ips: sealIpList,
    };
    return result;
}

const CantSealLocalIp = 'Can not ban innter IP address';
const CantSealSelf = 'Can not ban yourself';
const IpInSealList = 'IP is banned already';

/**
 * Ban IP address, only administrator
 */
export async function sealIp(ctx: Context<{ ip: string }>) {
    const { ip } = ctx.data;
    assert(ip !== '::1' && ip !== '127.0.0.1', CantSealLocalIp);
    assert(ip !== ctx.socket.ip, CantSealSelf);

    const isSealIp = await Redis.has(getSealIpKey(ip));
    assert(!isSealIp, IpInSealList);

    await Redis.set(getSealIpKey(ip), ip, Redis.Hour * 6);

    return {
        msg: 'ok',
    };
}

/**
 * Ban all IPs of user, only administrator
 */
export async function sealUserOnlineIp(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;

    const user = await User.findOne({ _id: userId });
    assert(user, 'User not found');
    const sockets = await Socket.find({ user: userId });
    const ipList = [
        ...sockets.map((socket) => socket.ip),
        user.lastLoginIp,
    ].filter(
        (ip) =>
            ip !== '' &&
            ip !== '::1' &&
            ip !== '127.0.0.1' &&
            ip !== ctx.socket.ip,
    );

    const isSealIpList = await Promise.all(
        ipList.map((ip) => Redis.has(getSealIpKey(ip))),
    );
    assert(!isSealIpList.every((isSealIp) => isSealIp), IpInSealList);

    await Promise.all(
        ipList.map(async (ip) => {
            await Redis.set(getSealIpKey(ip), ip, Redis.Hour * 6);
        }),
    );

    return {
        msg: 'ok',
    };
}

type STSResult = {
    enable: boolean;
    AccessKeyId: string;
    AccessKeySecret: string;
    bucket: string;
    region: string;
    SecurityToken: string;
    endpoint: string;
};

// eslint-disable-next-line consistent-return
export async function getSTS(): Promise<STSResult> {
    if (!config.aliyunOSS.enable) {
        // @ts-ignore
        return {
            enable: false,
        };
    }

    const sts = new STS({
        accessKeyId: config.aliyunOSS.accessKeyId,
        accessKeySecret: config.aliyunOSS.accessKeySecret,
    });
    try {
        const result = await sts.assumeRole(
            config.aliyunOSS.roleArn,
            undefined,
            undefined,
            'chatpuppy-uploader',
        );
        // @ts-ignore
        return {
            enable: true,
            region: config.aliyunOSS.region,
            bucket: config.aliyunOSS.bucket,
            endpoint: config.aliyunOSS.endpoint,
            ...result.credentials,
        };
    } catch (err) {
        const typedErr = err as Error;
        assert.fail(`Get STS Fail - ${typedErr.message}`);
    }
}

export async function uploadFile(
    ctx: Context<{ fileName: string; file: any; isBase64?: boolean }>,
) {
    try {
        if (config.aliyunOSS.enable) {
            const sts = await getSTS();
            const client = new OSS({
                accessKeyId: sts.AccessKeyId,
                accessKeySecret: sts.AccessKeySecret,
                bucket: sts.bucket,
                region: sts.region,
                stsToken: sts.SecurityToken,
            });
            const result = await client.put(
                ctx.data.fileName,
                ctx.data.isBase64
                    ? Buffer.from(ctx.data.file, 'base64')
                    : ctx.data.file,
            );
            if (result.res.status === 200) {
                return {
                    url: `//${config.aliyunOSS.endpoint}/${result.name}`,
                };
            }
            throw Error('Upload ali-oss fail');
        }

        const [directory, fileName] = ctx.data.fileName.split('/');
        const filePath = path.resolve('__dirname', '../public', directory);
        const isExists = await promisify(fs.exists)(filePath);
        if (!isExists) {
            await promisify(fs.mkdir)(filePath);
        }
        await promisify(fs.writeFile)(
            path.resolve(filePath, fileName),
            ctx.data.file,
        );
        return {
            url: `/${ctx.data.fileName}`,
        };
    } catch (err) {
        const typedErr = err as Error;
        logger.error('[uploadFile]', typedErr.message);
        return `Upload file fail: ${typedErr.message}`;
    }
}

export async function toggleSendMessage(ctx: Context<{ enable: boolean }>) {
    const { enable } = ctx.data;
    await Redis.set(DisableSendMessageKey, (!enable).toString());
    return {
        msg: 'ok',
    };
}

export async function toggleNewUserSendMessage(
    ctx: Context<{ enable: boolean }>,
) {
    const { enable } = ctx.data;
    await Redis.set(DisableNewUserSendMessageKey, (!enable).toString());
    return {
        msg: 'ok',
    };
}

export async function getSystemConfig() {
    return {
        disableSendMessage: (await Redis.get(DisableSendMessageKey)) === 'true',
        disableNewUserSendMessage:
            (await Redis.get(DisableNewUserSendMessageKey)) === 'true',
    };
}
