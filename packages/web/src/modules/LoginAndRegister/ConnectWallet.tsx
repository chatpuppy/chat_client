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
    const chain = Chains.find((i) => i.chain === netWork)?.value || Chains[0].value;
    const options = {
      chain: chain,
      address: address,
    };
    const { result } = await Web3Api.account.getNFTs(options);
    const nfts = result.filter((v, i, a) => a.findIndex((t) => t.token_uri === v.token_uri) === i && v.metadata);
    const image = nfts.length > 0 ? await getImgNFT(nfts[0].token_uri) : "";
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
