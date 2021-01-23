function ipNumber(ipAddress: string) {
    const ip = ipAddress.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ip) {
        return (+ip[1]<<24) + (+ip[2]<<16) + (+ip[3]<<8) + (+ip[4]);
    }

    throw new Error('Could not parse IP')
}

function ipMask(maskSize: number|string) {
    return -1 << (32 - Number(maskSize))
}

export default function ipCheck(allowed: string, ip: string): boolean {
  if (allowed.includes('/')) {
    const [allowedIp, maskStr] = allowed.split('/')
    return (ipNumber(ip) & ipMask(maskStr)) === ipNumber(allowedIp)
  }

  return allowed === ip
}
