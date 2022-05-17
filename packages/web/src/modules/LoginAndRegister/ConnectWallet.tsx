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

const blockies = require('../../lib/blockies.js');

const Chains = [
  {
    label: "Ethereum",
    value: "eth",
    chain: '0x1'
  },
  {
    label: "Binance Smart Chain",
    value: "bsc",
    chain: '0x38'
  },
  {
    label: "Polygon (Matic)",
    value: "matic",
    chain: '0x89'
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
  const { authenticate, isAuthenticated, setUserData, Moralis, isWeb3Enabled } = useMoralis();



  async function onConnectWallet() {
    
    setLoading(true);
    await authenticate({
      signingMessage: "ChatPuppy Authentication",
      onSuccess: async (result) => {
        const address = result.get("ethAddress");   
        const avatar = await getAvatarFromAddress(address);
        await handleRegister(address, avatar);
        Message.success("Connect Wallet Successfully");    
      },
      onError: (error) => {
        Message.error(error.message);
        setLoading(false);
        return;
      },
    });
  }

  async function getAvatarFromAddress(address: string) {
    let nfts;
    const chain = Chains.find((i) => i.label === netWork)?.value || Chains[0].value;
    let options = {
      chain: chain,
      address: address,
    };
    const { result } = await Web3Api.account.getNFTs(options); 
    nfts = result

    const dataNFT = nfts.find( (i: { token_uri: any; })=> i.token_uri) || {}
    const image = Object.keys(dataNFT).length > 0 ? await getImgNFT(dataNFT.token_uri) : "";
    
    setOptionsRequest({ ...optionsRequest,...options})
    setListNFT([...listNFT, ...nfts]);

    return image ? getImgSrc(image) : blockies.create({ seed: address  ,size: 10 ,scale: 3 }).toDataURL();
  }

  async function handleRegister(address: string, avatar: string) {
    const options = { address:  address };
    let usename = '';
    try {
      let data  = await Web3Api.resolve.resolveAddress(options);
      usename = data.name
    } catch (error) {
      console.error(error);
    }
    if (!usename) usename = address
    const user = await register(address, avatar, usename, platform.os?.family, platform.name, platform.description);

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

    listNFT.length > 0 && listNFT.forEach(nft => {
      if(!nft.token_uri) setTimeout( async ()=>  await Web3Api.token.reSyncMetadata({ ...optionsRequest, flag:'uri' , token_id: nft.token_id}), 1000 )
    });

    setUserData({ chain: chain });
  }, [isAuthenticated]);

  useEffect(()=> {
    if (!isAuthenticated || !isWeb3Enabled) return;

    Moralis.onAccountChanged((account) => {
      console.log('account', account);
    });

    Moralis.onChainChanged((chain) => {
      const chainSupport = Chains.find((i) => i.chain === chain) || {}
      if(Object.keys(chainSupport).length > 0) {
        console.log('chainSupport', chainSupport)
        setUserData({ chain: chain });
      } else {
        Message.warning("This Chain No Support");
      }
    
    });

  }, [isAuthenticated, isWeb3Enabled])

  return (
    <div className={Style.loginRegister}>
      {!loading && (
        <>
          <h3 className={Style.title}>Choose Chains:</h3>
          <Select
            className={Style.network}
            defaultValue={Chains[0].label}
            // @ts-ignore
            onSelect={(value: object) => setNetWork(value)}
          >
            {Chains.map((item, index) => (
              <Option key={index} value={item.label}>{item.label}</Option>
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
