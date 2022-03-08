import fs from 'fs';
import path from 'path';
import axios from 'axios';
import assert, { AssertionError } from 'assert';
import { promisify } from 'util';
import RegexEscape from 'regex-escape';
import OSS, { STS } from 'ali-oss';

import config from '@chatpuppy/config/server';
import logger from '@chatpuppy/utils/logger';
import User from '@chatpuppy/database/gundb/models/user';
import Group from '@chatpuppy/database/gundb/models/group';

/** Baidu Voice token */
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
    const users = await User.getUserName(escapedKeywords);
    const groups = await Group.getGroupName(escapedKeywords);

    return {
        users,
        groups: groups.map((group) => ({
            _id: group.uuid,
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