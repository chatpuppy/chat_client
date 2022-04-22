import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import loadable from '@loadable/component';

import { useMoralis } from "react-moralis";

import { isMobile } from '@chatpuppy/utils/ua';
import { State } from '../../state/reducer';
import useIsLogin from '../../hooks/useIsLogin';
import Avatar from '../../components/Avatar';
import Tooltip from '../../components/Tooltip';
import IconButton from '../../components/IconButton';
import OnlineStatus from './OnlineStatus';
import useAction from '../../hooks/useAction';
import socket from '../../socket';
import Message from '../../components/Message';
import {displayAddress} from '../../utils/stringUtils'

import Admin from './Admin';

import Style from './Sidebar.less';
import useAero from '../../hooks/useAero';

const SelfInfoAsync = loadable(
    () =>
        // @ts-ignore
        import(/* webpackChunkName: "self-info" */ './SelfInfo'),
);
const SettingAsync = loadable(
    // @ts-ignore
    () => import(/* webpackChunkName: "setting" */ './Setting'),
);

function Sidebar() {

    const sidebarVisible = useSelector(
        (state: State) => state.status.sidebarVisible,
    );

    if (!sidebarVisible) {
        return null;
    }

    const { logout } = useMoralis();
    const action = useAction();
    const isLogin = useIsLogin();
    const isConnect = useSelector((state: State) => state.connect);
    const isAdmin = useSelector(
        (state: State) => state.user && state.user.isAdmin,
    );
    const avatar = useSelector(
        (state: State) => state.user && state.user.avatar,
    );

    const address = useSelector(
        (state: State) => state.user && state.user.address || ''
    );

    const username = useSelector(
        (state: State) => state.user &&  state.user.username || ''
    );

    const [selfInfoDialogVisible, toggleSelfInfoDialogVisible] =
        useState(false);
    const [adminDialogVisible, toggleAdminDialogVisible] = useState(false);
    const [downloadDialogVisible, toggleDownloadDialogVisible] =
        useState(false);
    const [rewardDialogVisible, toggleRewardDialogVisible] = useState(false);
    const [aboutDialogVisible, toggleAboutDialogVisible] = useState(false);
    const [settingDialogVisible, toggleSettingDialogVisible] = useState(false);
    const aero = useAero();


    function logoutUser() {
        logout();
        action.logout();
        window.localStorage.clear();
        Message.success('Loged out successfully');
        socket.disconnect();
        socket.connect();
    }

    function renderTooltip(text: string, component: JSX.Element) {
        const children = <div>{component}</div>;
        if (isMobile) {
            return children;
        }
        return (
            <Tooltip
                placement="right"
                mouseEnterDelay={0.3}
                overlay={<span>{text}</span>}
            >
                {children}
            </Tooltip>
        );
    }

    function displayName() {
        return username ? username.substring(0,3) : displayAddress(address);
    }

    return (
        <>
            <div className={Style.sidebar} {...aero}>
                {isLogin && avatar && (
                    <Avatar
                        className={Style.avatar}
                        src={avatar}
                        onClick={() => toggleSelfInfoDialogVisible(true)}
                    />
                )}
                { isLogin &&!avatar && (
                    <div className={Style.nonAvatar} onClick={() => toggleSelfInfoDialogVisible(true)}>{ displayName() }</div>
                )}
                {isLogin && (
                    <OnlineStatus
                        className={Style.status}
                        status={isConnect ? 'online' : 'offline'}
                    />
                )}
                <div className={Style.buttons}>
                    {isLogin &&
                        isAdmin &&
                        renderTooltip(
                            'Admin',
                            <IconButton
                                width={40}
                                height={40}
                                icon="administrator"
                                iconSize={28}
                                onClick={() => toggleAdminDialogVisible(true)}
                            />,
                        )}
                    <Tooltip
                        placement="right"
                        mouseEnterDelay={0.3}
                        overlay={<span>Home</span>}
                    >
                        <a
                            className={Style.linkButton}
                            href="https://www.chatpuppy.com"
                            target="_black"
                            rel="noopener noreferrer"
                        >
                            <IconButton
                                width={40}
                                height={40}
                                icon="home"
                                iconSize={26}
                            />
                        </a>
                    </Tooltip>
                    {/* ###### */}
                    {/* <Tooltip 
                        placement="right"
                        mouseEnterDelay={0.3}
                        overlay={<span>Grand</span>}
                    >
                        <a 
                            className={Style.linkButton}
                            href="https://www.chatpuppy.com/grand"
                            target="_black"
                            rel="noopener noreferrer"
                        >
                            <IconButton
                                width={40}
                                height={40}
                                icon="ethereum"
                                iconSize={26}
                            />
                        </a>
                    </Tooltip>

                    <Tooltip 
                        placement="right"
                        mouseEnterDelay={0.3}
                        overlay={<span>NFT Mystery box</span>}
                    >
                        <a 
                            className={Style.linkButton}
                            href="https://www.chatpuppy.com/mint"
                            target="_black"
                            rel="noopener noreferrer"
                        >
                            <IconButton
                                width={40}
                                height={40}
                                icon="box"
                                iconSize={26}
                            />
                        </a>
                    </Tooltip>

                    <Tooltip 
                        placement="right"
                        mouseEnterDelay={0.3}
                        overlay={<span>NFT Marketplace</span>}
                    >
                        <a 
                            className={Style.linkButton}
                            href="https://www.chatpuppy.com/marketplace"
                            target="_black"
                            rel="noopener noreferrer"
                        >
                            <IconButton
                                width={40}
                                height={40}
                                icon="shop"
                                iconSize={26}
                            />
                        </a>
                    </Tooltip> */}
                    <Tooltip
                        placement="right"
                        mouseEnterDelay={0.3}
                        overlay={<span>Github</span>}
                    >
                        <a
                            className={Style.linkButton}
                            href="https://github.com/chatpuppy"
                            target="_black"
                            rel="noopener noreferrer"
                        >
                            <IconButton
                                width={40}
                                height={40}
                                icon="github"
                                iconSize={26}
                            />
                        </a>
                    </Tooltip>
                    {isLogin &&
                        renderTooltip(
                            'Setting',
                            <IconButton
                                width={40}
                                height={40}
                                icon="setting"
                                iconSize={26}
                                onClick={() => toggleSettingDialogVisible(true)}
                            />,
                        )}
                    {isLogin &&
                        renderTooltip(
                            'Log out',
                            <IconButton
                                width={40}
                                height={40}
                                icon="logout"
                                iconSize={26}
                                onClick={logoutUser}
                            />,
                        )}
                </div>

                {isLogin && selfInfoDialogVisible && (
                    <SelfInfoAsync
                        visible={selfInfoDialogVisible}
                        onClose={() => toggleSelfInfoDialogVisible(false)}
                    />
                )}
                {isLogin && isAdmin && (
                    <Admin
                        visible={adminDialogVisible}
                        onClose={() => toggleAdminDialogVisible(false)}
                    />
                )}
                {isLogin && settingDialogVisible && (
                    <SettingAsync
                        visible={settingDialogVisible}
                        onClose={() => toggleSettingDialogVisible(false)}
                    />
                )}
            </div>
        </>
    );
}

export default Sidebar;
