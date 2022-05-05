import axios from 'axios';

export const getImgNFT = async(url: string) => {
  if(!url) return;
  let urlRequest = ''

  const idx = url.indexOf('/ipfs/')
  const prefixUrl  = url.slice(0, idx);
  
  urlRequest = url.replace(prefixUrl, 'https://ipfs.io')
  
  return await axios.get(urlRequest)
  .then(function (response) {
    // handle success
    return response.data.thumbnail || response.data.image || response.data.image_url || response.data.background_image
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
}


export const getImgSrc = (src: string) => {
  if(!src) return '';
  if (src.includes('ipfs://')) {
    return src.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return src;
};