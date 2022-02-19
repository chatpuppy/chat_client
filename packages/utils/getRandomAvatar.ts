const AvatarCount = 22;
const publicPath = process.env.PublicPath || '/';

/**
 * Random avatar
 * ######
 */
export default function getRandomAvatar() {
    const number = Math.floor(Math.random() * (AvatarCount + 1));
    return `${publicPath}avatar/${number}.jpg`;
}

/**
 * Default avatar
 */
export function getDefaultAvatar() {
    return `${publicPath}avatar/0.jpg`;
}
