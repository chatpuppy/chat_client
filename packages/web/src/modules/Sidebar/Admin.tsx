import React, { useEffect, useState } from 'react';

import { css } from 'linaria';
import Style from './Admin.less';
import Common from './Common.less';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import {
    getSealList,
    resetUserPassword,
    sealUser,
    setUserTag,
    sealIp,
    toggleSendMessage,
    toggleNewUserSendMessage,
    getSystemConfig,
} from '../../service';

const styles = {
    button: css`
        min-width: 100px;
        height: 36px;
        margin-right: 12px;
        padding: 0 10px;
    `,
};

type SystemConfig = {
    disableSendMessage: boolean;
    disableNewUserSendMessage: boolean;
};

interface AdminProps {
    visible: boolean;
    onClose: () => void;
}

function Admin(props: AdminProps) {
    const { visible, onClose } = props;

    const [tagUsername, setTagUsername] = useState('');
    const [tag, setTag] = useState('');
    const [resetPasswordUsername, setResetPasswordUsername] = useState('');
    const [sealUsername, setSealUsername] = useState('');
    const [sealList, setSealList] = useState({ users: [], ips: [] });
    const [sealIpAddress, setSealIpAddress] = useState('');
    const [systemConfig, setSystemConfig] = useState<SystemConfig>();

    async function handleGetSealList() {
        const sealListRes = await getSealList();
        if (sealListRes) {
            setSealList(sealListRes);
        }
    }
    async function handleGetSystemConfig() {
        const systemConfigRes = await getSystemConfig();
        if (systemConfigRes) {
            setSystemConfig(systemConfigRes);
        }
    }
    useEffect(() => {
        if (visible) {
            handleGetSystemConfig();
            handleGetSealList();
        }
    }, [visible]);

    /**
     * Update user tag
     */
    async function handleSetTag() {
        const isSuccess = await setUserTag(tagUsername, tag.trim());
        if (isSuccess) {
            Message.success('Update user tag successfully, refresh page');
            setTagUsername('');
            setTag('');
        }
    }

    /**
     * Reset user password
     */
    async function handleResetPassword() {
        const res = await resetUserPassword(resetPasswordUsername);
        if (res) {
            Message.success(`Reset user password successfully, new password:${res.newPassword}`);
            setResetPasswordUsername('');
        }
    }
    /**
     * Ban user
     */
    async function handleSeal() {
        const isSuccess = await sealUser(sealUsername);
        if (isSuccess) {
            Message.success('Banned user successfully');
            setSealUsername('');
            handleGetSealList();
        }
    }

    async function handleSealIp() {
        const isSuccess = await sealIp(sealIpAddress);
        if (isSuccess) {
            Message.success('Banned IP successfully');
            setSealIpAddress('');
            handleGetSealList();
        }
    }

    async function handleDisableSendMessage() {
        const isSuccess = await toggleSendMessage(false);
        if (isSuccess) {
            Message.success('Sending messages forbidden');
            handleGetSystemConfig();
        }
    }
    async function handleEnableSendMessage() {
        const isSuccess = await toggleSendMessage(true);
        if (isSuccess) {
            Message.success('Sending messages allowed');
            handleGetSystemConfig();
        }
    }

    async function handleDisableSNewUserendMessage() {
        const isSuccess = await toggleNewUserSendMessage(false);
        if (isSuccess) {
            Message.success('New user sending messages forbidden');
            handleGetSystemConfig();
        }
    }
    async function handleEnableNewUserSendMessage() {
        const isSuccess = await toggleNewUserSendMessage(true);
        if (isSuccess) {
            Message.success('New user sending messages allowed');
            handleGetSystemConfig();
        }
    }

    return (
        <Dialog
            className={Style.admin}
            visible={visible}
            title="Admin console"
            onClose={onClose}
        >
            <div className={Common.container}>
                <div className={Common.block}>
                    {!systemConfig?.disableSendMessage ? (
                        <Button
                            className={styles.button}
                            type="danger"
                            onClick={handleDisableSendMessage}
                        >
                            Forbidden sending messages
                        </Button>
                    ) : (
                        <Button
                            className={styles.button}
                            onClick={handleEnableSendMessage}
                        >
                            Allow sending messages
                        </Button>
                    )}
                    {!systemConfig?.disableNewUserSendMessage ? (
                        <Button
                            className={styles.button}
                            type="danger"
                            onClick={handleDisableSNewUserendMessage}
                        >
                            Forbidden new user sending messages
                        </Button>
                    ) : (
                        <Button
                            className={styles.button}
                            onClick={handleEnableNewUserSendMessage}
                        >
                            Allow new user sending messages
                        </Button>
                    )}
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Update tag</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={`${Style.input} ${Style.tagUsernameInput}`}
                            value={tagUsername}
                            onChange={setTagUsername}
                            placeholder="Username"
                        />
                        <Input
                            className={`${Style.input} ${Style.tagInput}`}
                            value={tag}
                            onChange={setTag}
                            placeholder="Tag"
                        />
                        <Button className={Style.button} onClick={handleSetTag}>
                            Confirm
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Reset password</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={resetPasswordUsername}
                            onChange={setResetPasswordUsername}
                            placeholder="Username"
                        />
                        <Button
                            className={Style.button}
                            onClick={handleResetPassword}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>Forbidden user</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealUsername}
                            onChange={setSealUsername}
                            placeholder="Username"
                        />
                        <Button className={Style.button} onClick={handleSeal}>
                            Confirm
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Forbidden user list</p>
                    <div className={Style.sealList}>
                        {sealList.users.map((username) => (
                            <span className={Style.sealUsername} key={username}>
                                {username}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>Forbidden IP</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealIpAddress}
                            onChange={setSealIpAddress}
                            placeholder="IP address"
                        />
                        <Button className={Style.button} onClick={handleSealIp}>
                            Confirm
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Forbidden IP list</p>
                    <div className={Style.sealList}>
                        {sealList.ips.map((ip) => (
                            <span className={Style.sealUsername} key={ip}>
                                {ip}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default Admin;
