import React, { useEffect, useState } from "react";
import { getImgNFT, getImgSrc } from "../utils/getImgNFT";
import Style from "./NFT.less";

const NFT =({ url = "", selectNFT, selected }) => {
  const [imgSrc, setImgSrc] = useState("");
  const [ errored, setErrored] = useState(false);

  async function fetchImageAPI() {
    const image = await getImgNFT(url);
    console.log('getImgSrc(image)', getImgSrc(image))
    setImgSrc(getImgSrc(image));
  }

  useEffect(() => {
    if(!url) return;
    fetchImageAPI();
  }, []);

  const handleErrorLoad = () => {
    setErrored(true);
  }

  return (
    <>
      {imgSrc && !errored && (
        <div onClick={() => selectNFT(getImgSrc(imgSrc))}>
          <img className={`${Style.avatar} ${imgSrc === selected ? Style.selected : ""}`} src={imgSrc} onError={handleErrorLoad}/>
        </div>
      )}
    </>
  );
}

export default NFT;