
export const parseAddress = (address: string) => {
  if(!address || !address.startsWith('0x')) return address
  return address.slice(0,6) + '...' + address.slice(-4)
}

export const displayAddress = (address: string) => { 
  if(!address) return '';
  if(address && !address.startsWith('0x')) return address.substring(0,3)
  return address.slice(2,5)
}