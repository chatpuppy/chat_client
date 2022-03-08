import ip from 'ip';

const { env } = process;

export default {
    /** Server host */
    host: env.Host || ip.address(),

    // service port
    port: env.Port ? parseInt(env.Port, 10) : 9200,

    // mongodb address
    database: env.Database || 'mongodb://localhost:27017/chatpuppy',

    // redis: {
    //     host: env.RedisHost || 'localhost',
    //     port: env.RedisPort ? parseInt(env.RedisPort, 10) : 6379,
    // },

    // jwt encryption secret
    jwtSecret: env.JwtSecret || 'jwtSecret',

    // Maximize the number of groups
    maxGroupsCount: env.MaxGroupCount ? parseInt(env.MaxGroupCount, 10) : 3,

    allowOrigin: env.AllowOrigin ? env.AllowOrigin.split(',') : null,

    // token expires time
    tokenExpiresTime: env.TokenExpiresTime
        ? parseInt(env.TokenExpiresTime, 10)
        : 1000 * 60 * 60 * 24 * 30,

    // administrator user id
    administrator: env.Administrator ? env.Administrator.split(',') : [],

    /** Forbidden register */
    disableRegister: env.DisableRegister
        ? env.DisableRegister === 'true'
        : false,

    /** disable user create new group */
    disableCreateGroup: env.DisableCreateGroup
        ? env.DisableCreateGroup === 'true'
        : false,

    /** Aliyun OSS */
    aliyunOSS: {
        enable: env.ALIYUN_OSS ? env.ALIYUN_OSS === 'true' : false,
        accessKeyId: env.ACCESS_KEY_ID || '',
        accessKeySecret: env.ACCESS_KEY_SECRET || '',
        roleArn: env.ROLE_ARN || '',
        region: env.REGION || '',
        bucket: env.BUCKET || '',
        endpoint: env.ENDPOINT || '',
    },
};
