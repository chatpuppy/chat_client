import React, { useState, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMoralis, useMoralisWeb3Api } from "react-moralis";

import readDiskFIle from '../../utils/readDiskFile';
import uploadFile, { getOSSFileUrl } from '../../utils/uploadFile';
import Style from './GroupManagePanel.less';
import useIsLogin from '../../hooks/useIsLogin';
import { State, GroupMember } from '../../state/reducer';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import Avatar from '../../components/Avatar';
import Tooltip from '../../components/Tooltip';
import Dialog from '../../components/Dialog';
import NFT from "../../components/NFT";

import {
    changeGroupName,
    changeGroupAvatar,
    deleteGroup,
    leaveGroup,
} from '../../service';
import useAction from '../../hooks/useAction';
import config from '../../../../config/client';
import { ShowUserOrGroupInfoContext } from '../../context';

interface GroupManagePanelProps {
    visible: boolean;
    onClose: () => void;
    groupId: string;
    avatar: string;
    creator: string;
    onlineMembers: GroupMember[];
    name: string;
}

function GroupManagePanel(props: GroupManagePanelProps) {
    const Web3Api = useMoralisWeb3Api();
    const { visible, onClose, groupId, avatar, creator, onlineMembers, name } = props;
    const { user } = useMoralis();

    const action = useAction();
    const isLogin = useIsLogin();
    const selfId = useSelector((state: State) => state.user?._id);
    const userAddress = useSelector((state: State) => (state.user && state.user.address) || "");

    const [deleteConfirmDialog, setDialogStatus] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [nfts, setNfts] = useState([]);
    const [selected, setSelected] = useState("");
    const [avatarNFT, setAvatarNFT] = useState("");
    const [loading, setLoading] = useState(false);

    const context = useContext(ShowUserOrGroupInfoContext);

    useEffect(() => {
        if(!userAddress) return
        getNFT();
        setGroupName(name);
      }, [userAddress]);

      useEffect(() => {
        setGroupName(name);
      }, [name]);

    async function handleChangeGroupName() {
        const isSuccess = await changeGroupName(name, groupName);
        if (isSuccess) {
            Message.success('Update group name successfully');
            action.setLinkmanProperty(groupId, 'name', groupName);
        }
    }

    async function handleChangeGroupAvatar() {
        try {
            const isSuccess = await changeGroupAvatar(name, selected);
            if (isSuccess) {
                action.setLinkmanProperty(
                    groupId,
                    'avatar',
                    selected,
                );
                Message.success('Update avatar successfully');
            }
        } catch (err) {
            console.error(err);
            Message.error('Upload avatar image fail');
        }
    }

    async function handleDeleteGroup() {
        const isSuccess = await deleteGroup(groupId);
        if (isSuccess) {
            setDialogStatus(false);
            onClose();
            action.removeLinkman(groupId);
            Message.success('Dismiss group successfully');
        }
    }

    async function handleLeaveGroup() {
        const isSuccess = await leaveGroup(groupId);
        if (isSuccess) {
            onClose();
            action.removeLinkman(groupId);
            Message.success('Quit group successfully');
        }
    }

    function handleClickMask(e: React.MouseEvent) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    function handleShowUserInfo(userInfo: any) {
        if (userInfo._id === selfId) {
            return;
        }
        // @ts-ignore
        context.showUserInfo(userInfo);
        onClose();
    }

    async function getNFT() {
        setLoading(true)
        const chain = user && user.get("chain");
        const options = {
          chain: chain,
          address: userAddress,
        };
        const { result } = await Web3Api.account.getNFTs(options);
        setNfts(result);
        setLoading(false);
      }
    
      function selectNFT(image: string) {
        setSelected(image);
        setAvatarNFT(image)
      }

    return (
        <div
            className={`${Style.groupManagePanel} ${visible ? 'show' : 'hide'}`}
            onClick={handleClickMask}
            role="button"
            data-float-panel="true"
        >
            <div
                className={`${Style.container} ${
                    visible ? Style.show : Style.hide
                }`}
            >
                <p className={Style.title}>Group Info</p>
                <div className={Style.content}>
                    {isLogin && selfId === creator ? (
                        <div className={Style.block}>
                            <p className={Style.blockTitle}>Update group name</p>
                            <Input
                                className={Style.input}
                                value={groupName}
                                onChange={setGroupName}
                            />
                            <Button
                                className={`${Style.button} ${(!groupName || name === groupName ) && Style.disabled}`}
                                onClick={handleChangeGroupName}
                            >
                                Confirm
                            </Button>
                        </div>
                    ) : null}
                    {isLogin && selfId === creator ? (
                        <div className={Style.block}>
                            <p className={Style.blockTitle}>Update group avatar</p>
                            { !loading && nfts.length > 0 ? (
                                <>
                                <div className={Style.listAvatar}>{ nfts.map((item, index) => <NFT key={index} url={item.token_uri} selectNFT={selectNFT} selected={selected} />)}</div>
                                <Button className={`${Style.button} ${(!avatarNFT || !selected)  && Style.disabled}`} onClick={ handleChangeGroupAvatar}>
                                    Save Avatar
                                </Button>
                                </>
                        ) : (
                            !loading && <div> NFTs not found</div>
                        )}
                        </div>
                    ) : null}

                    <div className={Style.block}>
                        <p className={Style.blockTitle}>Setting</p>
                        {selfId === creator ? (
                            <Button
                                className={Style.button}
                                type="danger"
                                onClick={() => setDialogStatus(true)}
                            >
                                Dismiss group
                            </Button>
                        ) : (
                            <Button
                                className={Style.button}
                                type="danger"
                                onClick={handleLeaveGroup}
                            >
                                Quit group
                            </Button>
                        )}
                    </div>
                    <div className={Style.block}>
                        <p className={Style.blockTitle}>
                            Online members &nbsp;<span>{onlineMembers.length}</span>
                        </p>
                        <div>
                            {onlineMembers.map((member) => (
                                <div
                                    key={member.user._id}
                                    className={Style.onlineMember}
                                >
                                    <div
                                        className={Style.userinfoBlock}
                                        onClick={() =>
                                            handleShowUserInfo(member.user)
                                        }
                                        role="button"
                                    >
                                        <Avatar
                                            size={24}
                                            src={member.user.avatar}
                                        />
                                        <p className={Style.username}>
                                            {member.user.username}
                                        </p>
                                    </div>
                                    <Tooltip
                                        placement="top"
                                        trigger={['hover']}
                                        overlay={
                                            <span>{member.environment}</span>
                                        }
                                    >
                                        <p className={Style.clientInfoText}>
                                            {member.browser}
                                            &nbsp;&nbsp;
                                            {member.os ===
                                            'Windows Server 2008 R2 / 7'
                                                ? 'Windows 7'
                                                : member.os}
                                        </p>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Dialog
                        className={Style.deleteGroupConfirmDialog}
                        title="Are you sure you want to dismiss group?"
                        visible={deleteConfirmDialog}
                        onClose={() => setDialogStatus(false)}
                    >
                        <Button
                            className={Style.deleteGroupConfirmButton}
                            type="danger"
                            onClick={handleDeleteGroup}
                        >
                            Confirm
                        </Button>
                        <Button
                            className={Style.deleteGroupConfirmButton}
                            onClick={() => setDialogStatus(false)}
                        >
                            Cancel
                        </Button>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}

export default GroupManagePanel;