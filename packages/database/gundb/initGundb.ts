import Gun from 'gun'
import config from '@fiora/config/server';

export const gun = Gun({peers: [`http://localhost:9201/gun`], localStorage: false})

