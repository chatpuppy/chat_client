import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useMoralis, useMoralisWeb3Api } from "react-moralis";

import Dialog from "../../components/Dialog";
import Button from "../../components/Button";
import Input from "../../components/Input";
import NFT from "../../components/NFT";
import { State } from "../../state/reducer";
import Message from "../../components/Message";
import { changeAvatar, changeUsername } from "../../service";
import useAction from "../../hooks/useAction";
import socket from "../../socket";
import Style from "./SelfInfo.less";
import Common from "./Common.less";

interface SelfInfoProps {
  visible: boolean;
  onClose: () => void;
}

function SelfInfo(props: SelfInfoProps) {
  const { visible, onClose } = props;

  const Web3Api = useMoralisWeb3Api();
  const { user } = useMoralis();

  const action = useAction();
  const userAddresssss = useSelector((state: State) => (state.user) || "");
  const userNameInfo = useSelector((state: State) => (state.user &&  state.user.username) || "");
  const userAddress = useSelector((state: State) => (state.user && state.user.address) || "");
  const avatar = useSelector((state: State) => state.user?.avatar);
  const primaryColor = useSelector((state: State) => state.status.primaryColor);
  const [loading, setLoading] = useState(false);
  const [nfts, setNfts] = useState([]);
  const [selected, setSelected] = useState("");
  const [username, setUsername] = useState("");
  const [avatarNFT, setAvatarNFT] = useState("");

  useEffect(() => {
    getNFT();
  }, []);

  useEffect(() => {
    setUsername(userNameInfo)
  }, [userNameInfo])


  function reLogin(message: string) {
    Message.success(message);
    socket.disconnect();
    socket.connect();
  }

  /**
   * Change Avatar
   */
  async function handleChangeAvatar() {
    const isSuccess = await changeAvatar(avatarNFT, userAddress);
    if (isSuccess) {
      onClose();
      reLogin("Avatar update successfully, sign in again");
    }
  }


  /**
   * Change username
   */
  async function handleChangeUsername() {
    const isSuccess = await changeUsername(username, userAddress);
    if (isSuccess) {
      onClose();
      reLogin("Username update successfully, sign in again");
    }
  }

  function handleCloseDialog(event: any) {
    if (event.target.className === "rc-dialog-close-x") {
      onClose();
    }
  }

  async function getNFT() {
    setLoading(true);
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
    <Dialog className={Style.selfInfo} visible={visible} title="Setting" onClose={handleCloseDialog}>
      <div className={Common.container}>
        <div className={Common.block}>
          <p className={Common.title}>Update Avatar</p>
          { !loading && nfts.length > 0 ? (
            <>
              <div className={Style.listAvatar}>{ nfts.map((item, index) => <NFT key={index} url={item.token_uri} selectNFT={selectNFT} selected={selected} />)}</div>
              <Button className={`${Style.button} ${!avatarNFT && Style.disabled}`} onClick={ handleChangeAvatar}>
                Save Avatar
              </Button>
            </>
          ) : (
            !loading && <div> NFTs not found</div>
          )}
        </div>
        <div className={Common.block}>
          <p className={Common.title}>Update UserName</p>
          <div>
            <Input className={Style.input} value={username} onChange={setUsername} type="text" placeholder="Username" />
            <Button className={`${Style.button} ${(!username || userNameInfo == username)  && Style.disabled}`} onClick={handleChangeUsername}>
              Save User Name
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default SelfInfo;
