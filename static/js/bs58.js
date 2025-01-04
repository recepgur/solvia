// Base58 encoding/decoding library
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP = {}
const BASE = ALPHABET.length
const LEADER = ALPHABET.charAt(0)

for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i
}

function encode(buffer) {
    if (buffer.length === 0) return ''
    
    const digits = [0]
    for (let i = 0; i < buffer.length; i++) {
        for (let j = 0; j < digits.length; j++) {
            digits[j] <<= 8
        }
        
        digits[0] += buffer[i]
        
        let carry = 0
        for (let j = 0; j < digits.length; ++j) {
            digits[j] += carry
            carry = (digits[j] / BASE) | 0
            digits[j] %= BASE
        }
        
        while (carry) {
            digits.push(carry % BASE)
            carry = (carry / BASE) | 0
        }
    }
    
    for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
        digits.push(0)
    }
    
    return digits.reverse().map(digit => ALPHABET[digit]).join('')
}

function decode(string) {
    if (string.length === 0) return new Uint8Array(0)
    
    const bytes = [0]
    for (let i = 0; i < string.length; i++) {
        const value = ALPHABET_MAP[string[i]]
        if (value === undefined) {
            throw new Error('Non-base58 character')
        }
        
        for (let j = 0; j < bytes.length; j++) {
            bytes[j] *= BASE
        }
        bytes[0] += value
        
        let carry = 0
        for (let j = 0; j < bytes.length; ++j) {
            bytes[j] += carry
            carry = bytes[j] >> 8
            bytes[j] &= 0xff
        }
        
        while (carry) {
            bytes.push(carry & 0xff)
            carry >>= 8
        }
    }
    
    for (let i = 0; string[i] === LEADER && i < string.length - 1; i++) {
        bytes.push(0)
    }
    
    return new Uint8Array(bytes.reverse())
}

window.bs58 = { encode, decode }
