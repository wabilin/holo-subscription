import ipCheck from './ipCheck'

describe('ipCheck', () => {
  it('true when given same IPs', () => {
    expect(ipCheck('149.154.160.0', '149.154.160.0')).toBe(true)
    expect(ipCheck('91.108.4.0', '91.108.4.0')).toBe(true)
  })

  it('false when given different IPs', () => {
    expect(ipCheck('149.154.160.0', '149.154.160.1')).toBe(false)
    expect(ipCheck('91.108.4.0', '91.108.14.0')).toBe(false)
  })

  it('true when in subnet', () => {
    expect(ipCheck('149.154.160.0/20', '149.154.160.0')).toBe(true)
    expect(ipCheck('149.154.160.0/20', '149.154.169.123')).toBe(true)
    expect(ipCheck('149.154.160.0/20', '149.154.175.255')).toBe(true)

    expect(ipCheck('91.108.4.0/22', '91.108.4.0')).toBe(true)
    expect(ipCheck('91.108.4.0/22', '91.108.5.10')).toBe(true)
    expect(ipCheck('91.108.4.0/22', '91.108.7.255')).toBe(true)
  })

  it('false when not in subnet', () => {
    expect(ipCheck('149.154.160.0/20', '10.15.160.0')).toBe(false)
    expect(ipCheck('149.154.160.0/20', '149.154.159.255')).toBe(false)
    expect(ipCheck('149.154.160.0/20', '149.154.176.0')).toBe(false)

    expect(ipCheck('91.108.4.0/22', '9.10.11.12')).toBe(false)
    expect(ipCheck('91.108.4.0/22', '91.108.3.255')).toBe(false)
    expect(ipCheck('91.108.4.0/22', '91.108.8.000')).toBe(false)
  })
})
