import React, { Component, createRef } from 'react';
import pureRender from 'pure-render-decorator';
import { connect } from 'react-redux';

import Time from '@chatpuppy/utils/time';
import { getRandomColor, getPerRandomColor } from '@chatpuppy/utils/getRandomColor';
import client from '@chatpuppy/config/client';
import Style from './Message.less';
import Avatar from '../../../components/Avatar';
import TextMessage from './TextMessage';
import { ShowUserOrGroupInfoContext } from '../../../context';
import ImageMessage from './ImageMessage';
import CodeMessage from './CodeMessage';
import UrlMessage from './UrlMessage';
import InviteMessageV2 from './InviteMessageV2';
import SystemMessage from './SystemMessage';
import store from '../../../state/store';
import { ActionTypes, DeleteMessagePayload } from '../../../state/action';
import { deleteMessage } from '../../../service';
import IconButton from '../../../components/IconButton';
import { State } from '../../../state/reducer';
import Tooltip from '../../../components/Tooltip';
import themes from '../../../themes';
import FileMessage from './FileMessage';

const { dispatch } = store;

interface MessageProps {
    id: string;
    linkmanId: string;
    isSelf: boolean;
    userId: string;
    avatar: string;
    username: string;
    originUsername: string;
    tag: string;
    time: string;
    type: string;
    content: string;
    loading: boolean;
    percent: number;
    shouldScroll: boolean;
    tagColorMode: string;
    isAdmin?: boolean;
}

interface MessageState {
    showButtonList: boolean;
}

/**
* There are some problems in implementing the message component with hooks.
* functionally, the Message component is required to trigger scrolling after rendering. In actual measurement, it is found that triggering scrolling in useEffect will be later than in componentDidMount.
* The concrete performance is that you will first see the historical news, then flash it and then scroll to the appropriate position.
 */
@pureRender
class Message extends Component<MessageProps, MessageState> {
    $container = createRef<HTMLDivElement>();

    constructor(props: MessageProps) {
        super(props);
        this.state = {
            showButtonList: false,
        };
    }

    componentDidMount() {
        const { shouldScroll } = this.props;
        if (shouldScroll) {
            // @ts-ignore
            this.$container.current.scrollIntoView();
        }
    }

    handleMouseEnter = () => {
        const { isAdmin, isSelf, type } = this.props;
        if (type === 'system') {
            return;
        }
        if (isAdmin || (!client.disableDeleteMessage && isSelf)) {
            this.setState({ showButtonList: true });
        }
    };

    handleMouseLeave = () => {
        const { isAdmin, isSelf } = this.props;
        if (isAdmin || (!client.disableDeleteMessage && isSelf)) {
            this.setState({ showButtonList: false });
        }
    };

    /**
     * Revoke message by admin
     */
    handleDeleteMessage = async () => {
        const { id, linkmanId, loading, isAdmin } = this.props;
        if (loading) {
            dispatch({
                type: ActionTypes.DeleteMessage,
                payload: {
                    linkmanId,
                    messageId: id,
                    shouldDelete: isAdmin,
                } as DeleteMessagePayload,
            });
            return;
        }

        const isSuccess = await deleteMessage(id);
        if (isSuccess) {
            dispatch({
                type: ActionTypes.DeleteMessage,
                payload: {
                    linkmanId,
                    messageId: id,
                    shouldDelete: isAdmin,
                } as DeleteMessagePayload,
            });
            this.setState({ showButtonList: false });
        }
    };

    handleClickAvatar(showUserInfo: (userinfo: any) => void) {
        const { isSelf, userId, type, username, avatar } = this.props;
        if (!isSelf && type !== 'system') {
            showUserInfo({
                _id: userId,
                username,
                avatar,
            });
        }
    }

    formatTime() {
        const { time } = this.props;
        const messageTime = new Date(time);
        const nowTime = new Date();
        if (Time.isToday(nowTime, messageTime)) {
            return Time.getHourMinute(messageTime);
        }
        if (Time.isYesterday(nowTime, messageTime)) {
            return `Yesterday ${Time.getHourMinute(messageTime)}`;
        }
        return `${Time.getMonthDate(messageTime)} ${Time.getHourMinute(
            messageTime,
        )}`;
    }

    renderContent() {
        const { type, content, loading, percent, originUsername } = this.props;
        switch (type) {
            case 'text': {
                return <TextMessage content={content} />;
            }
            case 'image': {
                return (
                    <ImageMessage
                        src={content}
                        loading={loading}
                        percent={percent}
                    />
                );
            }
            case 'file': {
                return <FileMessage file={content} percent={percent} />;
            }
            case 'code': {
                return <CodeMessage code={content} />;
            }
            case 'url': {
                return <UrlMessage url={content} />;
            }
            case 'inviteV2': {
                return <InviteMessageV2 inviteInfo={content} />;
            }
            case 'system': {
                return (
                    <SystemMessage
                        message={content}
                        username={originUsername}
                    />
                );
            }
            default:
                return <div className="unknown">Unsupported message type</div>;
        }
    }

    render() {
        const { isSelf, avatar, tag, tagColorMode, username } = this.props;
        const { showButtonList } = this.state;

        let tagColor = `rgb(${themes.default.primaryColor})`;
        if (tagColorMode === 'fixedColor') {
            tagColor = getRandomColor(tag);
        } else if (tagColorMode === 'randomColor') {
            tagColor = getPerRandomColor(username);
        }

        return (
            <div
                className={`${Style.message} ${isSelf ? Style.self : ''}`}
                ref={this.$container}
            >
                <ShowUserOrGroupInfoContext.Consumer>
                    {(context) => (
                        <Avatar
                            className={Style.avatar}
                            src={avatar}
                            size={44}
                            onClick={() =>
                                // @ts-ignore
                                this.handleClickAvatar(context.showUserInfo)
                            }
                        />
                    )}
                </ShowUserOrGroupInfoContext.Consumer>
                <div className={Style.right}>
                    <div className={Style.nicknameTimeBlock}>
                        {tag && (
                            <span
                                className={Style.tag}
                                style={{ backgroundColor: tagColor }}
                            >
                                {tag}
                            </span>
                        )}
                        <span className={Style.nickname}>{username}</span>
                        <span className={Style.time}>{this.formatTime()}</span>
                    </div>
                    <div
                        className={Style.contentButtonBlock}
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                    >
                        <div className={Style.content}>
                            {this.renderContent()}
                        </div>
                        {showButtonList && (
                            <div className={Style.buttonList}>
                                <Tooltip
                                    placement={isSelf ? 'left' : 'right'}
                                    mouseEnterDelay={0.3}
                                    overlay={<span>Revoke</span>}
                                >
                                    <div>
                                        <IconButton
                                            className={Style.button}
                                            icon="recall"
                                            iconSize={16}
                                            width={20}
                                            height={20}
                                            onClick={this.handleDeleteMessage}
                                        />
                                    </div>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                    <div className={Style.arrow} />
                </div>
            </div>
        );
    }
}

export default connect((state: State) => ({
    isAdmin: !!(state.user && state.user.isAdmin),
}))(Message);
