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
        const index = new Date().toISOString()
        return group
    },

    async save(group: GroupDocument) {
        const members = group.members as string
        if (group.isDefault) {
            // @ts-ignore
            gun.get('groups').get('defaultGroup').get('members').put(members)
        }else {
            // @ts-ignore
            gun.get('groups').get(group.name).get('members').put(members)
        }
    },


    createDefaultGroup(group: GroupDocument) {
        const linkId = uuid();
        const members = '';
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
        const index = new Date().toISOString()
        // @ts-ignore
        // gun.get('messages').get(group.uuid).get(index).put(null)
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
        let current_group = {} as GroupDocument
        let promises = new Promise<void>((resolve, reject) => {
            gun.get('groups').map().on((data: GroupDocument) => {
                if(data.uuid == uuid) current_group = data
                resolve()
            })
        })
        await promises
        return current_group
    },

    async getDefaultGroup() {
        let defaultGroup = {} as GroupDocument
        logger.info("bbbbb")
        await gun.get('groups').get("defaultGroup").once((data) => {
            if (data){
                defaultGroup = data as GroupDocument
                defaultGroup._id = data.uuid
            }
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
        let promises = new Promise<void>((resolve, reject) => {
            gun.get('groups').map().on(data => {
                if(data.creator === uuid) {
                    count++
                }
                resolve()
            })
        })
        await promises
        return count
    },

    async checkName(name: string) {
        const groupList = [] as string[]
        // gun.get('groups').map(group => group && group.name == name ? group : undefined).on((group) =>  {
        //     groupList.push(group.name)
        // })
        let promises = new Promise<void>((resolve, reject) => {
            gun.get('groups').map().on(data => {
                logger.info(data)
                if(data.name === name) {
                    groupList.push(data)
                }
                resolve()
            })
        })
        await promises
        if (groupList.length > 0) {
            return true
        }
        return false
    },

    async getGroupByMember(user: UserDocument): Promise<Array<GroupDocument>> {
        let array: Array<GroupDocument> = []
        array = await this.getGroups(user.uuid)
        logger.info("groups", array)
        return Promise.all(array)
    },

    async getGroups(user_uuid: string): Promise<Array<GroupDocument>> {
        const groups: Array<GroupDocument> = []
        let promies = new Promise<void>((resolve, reject) => {
            gun.get('groups').map().on((group: GroupDocument) => {
                if (group.hasOwnProperty('members') && group.members.includes(user_uuid)) {
                    groups.push(group)
                }
                resolve()
            })
        })
        await promies
        logger.info(groups)
        if (groups.length > 0) {
            await Promise.allSettled(groups)
        }
        return groups
    },

    async getGroupName(name: string) {
        const groupList: Array<GroupDocument> = []
        let promise = new Promise<void>((resolve, reject) => {
            gun.get('groups').map().on((group: GroupDocument) => {
                if (group.hasOwnProperty('name') && group.name.includes(name)){
                    groupList.push(group)
                    
                }
                resolve()
            })
        })
        await promise
        if (groupList.length > 0) {
            await Promise.allSettled(groupList)
        }
        return groupList
    },


    async saveGroup( group: GroupDocument, avatar: string) {
        // @ts-ignore
        gun.get('groups').get(group.name).get('avatar').put(avatar)
        return group
    },


    async getGroup(name: string) {
        let group = {} as GroupDocument
        let promise = new Promise((resolve, reject) => {
            gun.get('groups').get(name).on((data: GroupDocument) => {
                data._id = data.uuid
                group = data
            })
        })
        await promise
        return group
    },


    async updateName(group: GroupDocument, new_name: string) {
        // @ts-ignore
        gun.get('groups').get(group.name).put(null)
        group.name = new_name
        gun.get('groups').get(new_name).put(group as GroupDocument)
        return group._id
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


function delay(ms: number) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}