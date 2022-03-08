import config from '@chatpuppy/config/server';
import { doctor } from '@chatpuppy/bin/scripts/doctor';
import logger from '@chatpuppy/utils/logger';
import Group, { GroupDocument } from '@chatpuppy/database/gundb/models/group';
import getRandomAvatar from '@chatpuppy/utils/getRandomAvatar';
import app from './app';


(async () => {
    if (process.argv.find((argv) => argv === '--doctor')) {
        await doctor();
    }

    const server = await app.listen(config.port, async () => {
        // await Socket.deleteMany({}); // Delete all historical data del of Socket table
        logger.info(`>>> server listen on http://localhost:${config.port}`);
    });

    let defaultGroup = await Group.getDefaultGroup();
    if (Object.keys(defaultGroup).length === 0) {
        defaultGroup = Group.createDefaultGroup({
            name: 'PuppyWorld',
            avatar: getRandomAvatar(),
            isDefault: true,
            createTime: new Date().toString(),
            members: ''
        } as GroupDocument)

        if (!defaultGroup) {
            logger.error('[defaultGroup]', 'create default group fail');
        }
    }
    // Determine whether the default group exists or not, and create one if it does not exist.
    return null;
})();
