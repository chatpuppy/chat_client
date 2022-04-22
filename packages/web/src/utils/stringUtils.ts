
export const parseAddress = (address: string) => {
  if(!address || !address.startsWith('0x')) return address
  return address.slice(0,6) + '...' + address.slice(-4)
}

export const displayAddress = (address: string) => { 
  if(!address) return ''
  return address.slice(2,5)
}