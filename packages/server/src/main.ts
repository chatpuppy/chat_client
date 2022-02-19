import config from '@chatpuppy/config/server';
import getRandomAvatar from '@chatpuppy/utils/getRandomAvatar';
import { doctor } from '@chatpuppy/bin/scripts/doctor';
import logger from '@chatpuppy/utils/logger';
import initMongoDB from '@chatpuppy/database/mongoose/initMongoDB';
import Socket from '@chatpuppy/database/mongoose/models/socket';
import Group, { GroupDocument } from '@chatpuppy/database/mongoose/models/group';
import app from './app';

(async () => {
    if (process.argv.find((argv) => argv === '--doctor')) {
        await doctor();
    }

    await initMongoDB();

    // If default group not exist, create one
    const group = await Group.findOne({ isDefault: true });
    if (!group) {
        const defaultGroup = await Group.create({
            name: 'PuppyWorld',
            avatar: getRandomAvatar(),
            isDefault: true,
        } as GroupDocument);

        if (!defaultGroup) {
            logger.error('[defaultGroup]', 'create default group fail');
            return process.exit(1);
        }
    }

    app.listen(config.port, async () => {
        await Socket.deleteMany({}); // Delete Socket history table
        logger.info(`>>> server listen on http://localhost:${config.port}`);
    });

    return null;
})();
