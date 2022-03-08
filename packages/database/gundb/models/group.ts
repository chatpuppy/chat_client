import { v4 as uuid } from 'uuid';
import logger from '@chatpuppy/utils/logger';
import { gun } from "../initGundb";
import { UserDocument } from './user';

const Group = {
    async createGroup(group: GroupDocument) {
        // let current_group: GroupDocument | null = null
        group.uuid = uuid()
        group.createTime = new Date().toString()
        gun.get('groups').get(group.name).put({
            _id: group.uuid,
            uuid: group.uuid,
            name: group.name,
            avatar: group.avatar,
            isDefault: false,
            members: group.members,
            createTime: group.createTime,
            creator: group.creator
        }, (ack) => {

        })
        return group
    },

    async save(group: GroupDocument) {
        if (group.isDefault) {
            gun.get('groups').get('defaultGroup').set(group, (ack => {
            }))
        }else {
            gun.get('groups').get(group.name).set(group, ack => {
            })
        }
    },


    createDefaultGroup(group: GroupDocument) {
        const linkId = uuid();
        const members = '';
        // gun.get('groups').get('defaultGroup').once((data) => {
        //     logger.info("dataCreateGroup", data?.members)
        //     members = data?.members
        // })
        let defaultGroup = {} as GroupDocument
        gun.get('groups').get("defaultGroup").on((data) => {
            defaultGroup = data
        })



        gun.get('groups').get('defaultGroup').put({
            _id: linkId,
            uuid: linkId,
            name: group.name,
            avatar: group.avatar,
            isDefault: group.isDefault,
            createTime: new Date().toString(),
            members
        }, ack => {
        })
        group.uuid = linkId
        group._id = linkId
        defaultGroup = group
        
        return defaultGroup
    },

    async get(to: string) {
        let group =  {} as GroupDocument
        gun.get('groups').get('defaultGroup').map().on((data, key) => {
            group = data
        })
        return group
    },

    async getGroupByUuid(uuid: string) {
        let group = {} as GroupDocument
        await gun.get('groups').map().on((data, key) => {
            if (data.uuid === uuid){
                group = data
            }
        })
        return group
    },
    
    async getDefaultGroup() {
        let defaultGroup = {} as GroupDocument
        await gun.get('groups').get("defaultGroup").on((data) => {
            defaultGroup = data
        })
        return defaultGroup
    },

    async countGroup(uuid: string) {
        let count = 0
        gun.get('groups').on((data, key) => {
            if (data.creator === uuid) {
                count ++
            }
        })
        return count
    },

    async checkName(name: string) {
        const groupList = [] as string[]
        gun.get('groups').map().on((data, key) => {
            groupList.push(data.name)
            
        })
        for (let index = 0; index < groupList.length; index++) {
            const element = groupList[index];
            if (element === name) {
                return true
            }
            
        }
        return false
    },

    async getGroupByMember(user: UserDocument) {
        const groupList: GroupDocument[] = []
        gun.get('groups').map().on((data, key) => {
            data = data as GroupDocument
            try {
                const members = data.members.split(",")
                if (members.filter((member: string) => member === user.uuid).length > 0) {
                    groupList.push(data)
                }
            } catch (error) {
            }
        })

        return groupList
    },

    async getGroupName(name: string) {
        const groupList: GroupDocument[] = []
        gun.get('groups').map().on(data => {
            try{
                if(data.name.includes(name)) {
                    groupList.push(data)
                }
            } catch (e) {
            }

        })
        return groupList
    }
}

export interface GroupDocument extends Document {
    _id: string;
    uuid: string;
    /** GroupName */
    name: string;
    /** Avatar */
    avatar: string;
    /** Notice */
    announcement: string;
    /** Creator */
    creator: string;
    /** is Default Group */
    isDefault: boolean;
    /** members */
    members: string;
    /** createTime */
    createTime: string;
}

export default Group;