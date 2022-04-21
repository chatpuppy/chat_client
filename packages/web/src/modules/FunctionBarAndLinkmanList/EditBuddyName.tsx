import React, { useState } from "react";

import socket from "../../socket";

import Dialog from "../../components/Dialog";
import Button from "../../components/Button";
import Input from "../../components/Input";


import {changeNickNameFriend} from '../../service'

import Style from "./EditBuddyName.less";


interface EditBuddyNameProps {
  visible: boolean;
  onClose: () => void;
  friendId: string;
  userAddress: string;
}

const EditBuddyName = (props: EditBuddyNameProps) => {
  const { visible, onClose, friendId ,userAddress} = props;
  const [ nickname, setNickName] = useState("");

  const handleCloseDialog = (event: any) => {
    if (event.target.className === "rc-dialog-close-x") {
      onClose();
    }
  }


  const handleChangeNickNameBuddy = async() => {
    const friend = await changeNickNameFriend(userAddress,friendId, nickname);

    if(friend?.msg == 'ok') { 
      socket.disconnect();
      socket.connect();
      onClose();
    }
  }
  

  return (
    <Dialog className={Style.editBuddyName} visible={visible} title="Setting" onClose={handleCloseDialog}>
      <div className={Style.container}>
        <div className={Style.block}>
          <p className={Style.title}>Update Nickname</p>
          <Input className={Style.input} value={nickname} onChange={setNickName} type="text" placeholder="Nickname" />
          <Button className={`${Style.button} ${!nickname && Style.disabled}`} onClick={handleChangeNickNameBuddy}>
              Save Nickname
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default EditBuddyName;


