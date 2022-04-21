import React, { useState } from "react";
import { useSelector } from "react-redux";
import loadable from "@loadable/component";

import Time from "@chatpuppy/utils/time";
import { isMobile } from "@chatpuppy/utils/ua";

import Avatar from "../../components/Avatar";
import Tooltip from "../../components/Tooltip";
import IconButton from "../../components/IconButton";

import { State } from "../../state/reducer";
import useAction from "../../hooks/useAction";

import Style from "./Linkman.less";
import useAero from "../../hooks/useAero";
import { useStore } from "../../hooks/useStore";
import { updateHistory } from "../../service";

interface LinkmanProps {
  id: string;
  name: string;
  avatar: string;
  preview: string;
  unread: number;
  time: Date;
  type: string;
  uuid: string;
  nickname: string;
}

const EditBuddyNameAsync = loadable(
  () =>
    // @ts-ignore
    import("./EditBuddyName")
);

function Linkman(props: LinkmanProps) {
  const { id, uuid, name, nickname, avatar, preview, unread, time, type } = props;

  const action = useAction();
  const focus = useSelector((state: State) => state.focus);
  const userAddress = useSelector((state: State) => (state.user && state.user.address) || '');
  const aero = useAero();
  const { linkmans } = useStore();
  const [editBuddyNameDialogVisible, toggleEditBuddyNameDialogVisible] = useState(false);

  function formatTime() {
    const nowTime = new Date();
    if (Time.isToday(nowTime, time)) {
      return Time.getHourMinute(time);
    }
    if (Time.isYesterday(nowTime, time)) {
      return "Yesterday";
    }
    return Time.getMonthDate(time);
  }

  async function handleClick() {
    // Update next linkman read history
    const nextFocusLinkman = linkmans[id];
    if (nextFocusLinkman) {
      const messageKeys = Object.keys(nextFocusLinkman.messages);
      if (messageKeys.length > 0) {
        const lastMessageId = nextFocusLinkman.messages[messageKeys[messageKeys.length - 1]]._id;
        updateHistory(nextFocusLinkman._id, lastMessageId);
      }
    }

    action.setFocus(id);
    if (isMobile) {
      action.setStatus("functionBarAndLinkmanListVisible", false);
    }
  }

  function renderTooltip(text: string, component: JSX.Element) {
    const children = <div>{component}</div>;
    if (isMobile) {
      return children;
    }
    return (
      <Tooltip placement="right" mouseEnterDelay={0.3} overlay={<span>{text}</span>}>
        {children}
      </Tooltip>
    );
  }

  return (
    <>
      <div className={`${Style.linkman} ${id === focus ? Style.focus : ""}`} onClick={handleClick} role="button" {...aero}>
        <Avatar src={avatar} size={48} />
        <div className={Style.container}>
          <div className={`${Style.rowContainer} ${Style.nameTimeBlock}`}>
            <div className={Style.nameWrap}>
              <p className={Style.name}>{ nickname ? nickname : name}</p>
              {id === focus && type !== "group" && <div>{renderTooltip("Edit Name Buddy", <IconButton width={16} height={16} icon="setting" iconSize={16} onClick={() => toggleEditBuddyNameDialogVisible(true)} />)}</div>}
            </div>

            <p className={Style.time}>{formatTime()}</p>
          </div>
          <div className={`${Style.rowContainer} ${Style.previewUnreadBlock}`}>
            <p
              className={Style.preview}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: preview }}
            />
            {unread > 0 && (
              <div className={Style.unread}>
                <span>{unread > 99 ? "99+" : unread}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {editBuddyNameDialogVisible && <EditBuddyNameAsync userAddress={userAddress} friendId={uuid} visible={editBuddyNameDialogVisible} onClose={() => toggleEditBuddyNameDialogVisible(false)} />}
    </>
  );
}

export default Linkman;
