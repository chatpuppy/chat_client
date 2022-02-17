const AvatarCount = 22;
const publicPath = process.env.PublicPath || '/';

/**
 * 获取随机头像
 * ======
 */
export default function getRandomAvatar() {
    const number = Math.floor(Math.random() * (AvatarCount + 1));
    return `${publicPath}avatar/${number}.jpg`;
}

/**
 * 获取默认头像
 */
export function getDefaultAvatar() {
    return `${publicPath}avatar/0.jpg`;
}
