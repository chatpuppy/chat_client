import axios from 'axios';

export const getImgNFT = async(url: string) => {
    return await axios.get(url)
    .then(function (response) {
      // handle success
      return response.data.image
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
}


export const getImgSrc = (src: string) => {
  if(!src) return '';
  if (src.includes('ipfs://')) {
    const ipfsSrc = src.slice(7);
    return `https://ipfs.io/ipfs/${ipfsSrc}`;
  }
  return src;
};