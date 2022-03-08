import Gun from 'gun'
import config from '@chatpuppy/config/server';

export const gun = Gun({peers: [`http://localhost:9201/gun`], localStorage: false})

