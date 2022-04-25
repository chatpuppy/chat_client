import React, { useEffect, useState } from "react";
import platform from "platform";
import { useDispatch } from "react-redux";
import { useMoralisWeb3Api, useMoralis } from "react-moralis";
import ReactLoading from "react-loading";

import { Select, Option } from "../../components/Select";

import getFriendId from "@chatpuppy/utils/getFriendId";
import convertMessage from "@chatpuppy/utils/convertMessage";
import Style from "./ConnectWallet.less";
import Message from "../../components/Message";
import useAction from "../../hooks/useAction";
import { register, getLinkmansLastMessagesV2 } from "../../service";
import { Message as MessageReducer } from "../../state/reducer";
import { ActionTypes } from "../../state/action";
import { getImgNFT, getImgSrc } from "../../utils/getImgNFT";

const Chains = [
  {
    chain: "Ethereum",
    value: "eth",
  },
  {
    chain: "Binance Smart Chain",
    value: "bsc",
  },
  {
    chain: "Polygon (Matic)",
    value: "matic",
  },
];

interface ConnectWalletProps {
  loading: boolean;
  setLoading: any;
}


function ConnectWallet(props:ConnectWalletProps) {
  const [netWork, setNetWork] = useState("");
  const [listNFT, setListNFT] = useState([]);
  const [optionsRequest, setOptionsRequest] = useState({});
  const action = useAction();
  const dispatch = useDispatch();
  const Web3Api = useMoralisWeb3Api();

  const {loading, setLoading} = props;
  const { authenticate, isAuthenticated, setUserData } = useMoralis();

  async function onConnectWallet() {
    setLoading(true);
    await authenticate({
      signingMessage: "ChatPuppy Authentication",
      onSuccess: async (result) => {
        const address = result.get("ethAddress");
        Message.success("Connect Wallet Successfully");
        const avatar = await getAvatarFromAddress(address);
        await handleRegister(address, avatar);
      },
      onError: (error) => {
        Message.error(error.message);
        setLoading(false);
        return;
      },
    });
  }

  async function getAvatarFromAddress(address) {
    let nfts;
    const chain = Chains.find((i) => i.chain === netWork)?.value || Chains[0].value;
    let options = {
      chain: chain,
      address: address,
    };
 

    const { result } = await Web3Api.account.getNFTs(options); 

    nfts = result

    if(result.length > 0 && !result[0].token_uri ) {
      setTimeout( async ()=>  await Web3Api.token.reSyncMetadata({...options, flag:'uri' , token_id: result[0].token_id}), 1000 )
      setTimeout( async ()=> {      
        const { result } = await Web3Api.account.getNFTs(options);
        nfts = result;
      },1000)
    }
    
    const image = nfts.length > 0 ? await getImgNFT(nfts[0].token_uri) : "";

    setOptionsRequest({ ...optionsRequest,...options})
    setListNFT([...listNFT, ...nfts]);
    return image ? getImgSrc(image) : "";
  }

  async function handleRegister(address: string, avatar: string) {
    const user = await register(address, avatar, platform.os?.family, platform.name, platform.description);

    if (user) {
      action.setUser(user);
      action.toggleLoginRegisterDialog(false);
      window.localStorage.setItem("token", user.token);

      const linkmanIds = [...user.groups.map((group: any) => group._id), ...user.friends.map((friend: any) => getFriendId(friend.from, friend.to._id))];
      const linkmanMessages = await getLinkmansLastMessagesV2(linkmanIds);
      Object.values(linkmanMessages).forEach(
        // @ts-ignore
        ({ messages }: { messages: MessageReducer[] }) => {
          messages.forEach(convertMessage);
        }
      );
      dispatch({
        type: ActionTypes.SetLinkmansLastMessages,
        payload: linkmanMessages,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    const chain = Chains.find((i) => i.chain === netWork)?.value || Chains[0].value;
    setUserData({ chain: chain });
    listNFT.length > 0 && listNFT.forEach(nft => {
      if(!nft.token_uri) setTimeout( async ()=>  await Web3Api.token.reSyncMetadata({ ...optionsRequest, flag:'uri' , token_id: nft.token_id}), 1000 )
    });
  }, [isAuthenticated]);

  return (
    <div className={Style.loginRegister}>
      {!loading && (
        <>
          <h3 className={Style.title}>Choose Chains:</h3>
          <Select
            className={Style.network}
            defaultValue={Chains[0].chain}
            // @ts-ignore
            onSelect={(value: object) => setNetWork(value)}
          >
            {Chains.map((item, index) => (
              <Option key={index} value={item.chain}>{item.chain}</Option>
            ))}
          </Select>
        </>
      )}

      <button className={Style.button} onClick={onConnectWallet} type="button" disabled={loading}>
        {loading ? (
          <span>
            Connecting <ReactLoading type="bars" color="#fff" height={"10px"} width={"20px"} />
          </span>
        ) : (
          <span>Connect to Wallet</span>
        )}
      </button>
    </div>
  );
}

export default ConnectWallet;
