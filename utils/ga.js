const SHA = require('sha.js')

function addChar (str, index, char) {
  str = str.split('')
  str.splice(index, 0, char)
  return str.join('')
}

function dec2hex (s) {
  return (s < 15.5 ? '0' : '') + Math.round(s).toString(16)
}


function hex2dec (s) {
  return parseInt(s, 16)
}


function leftpad (str, len, pad) {
  if (len + 1 >= str.length) {
    str = Array(len + 1 - str.length).join(pad) + str
  }
  return str
}


function base32tohex (base32) {
  let base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  let hex = ''

  for (let i = 0; i < base32.length; i++) {
    let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    bits += leftpad(val.toString(2), 5, '0')
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    let chunk = bits.substr(i, 4)
    hex = hex + parseInt(chunk, 2).toString(16)
  }
  return hex
}

function calcTOTP (base32) {
  let key = base32tohex(base32)
  let epoch = Math.round(new Date().getTime() / 1000.0)
  let time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, '0')

  // updated for jsSHA - http://caligatio.github.io/jsSHA/
  let shaObj = new SHA('SHA-1', 'HEX')
  shaObj.setHMACKey(key, 'HEX')
  shaObj.update(time)

  let hmac = shaObj.getHMAC('HEX')

  let offset = hex2dec(hmac.substring(hmac.length - 1));

  let totp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + ''
  totp = totp.substr(totp.length - 6, 6)
  return addChar(totp, 3, ' ')
}


module.exports = {
  dec2hex: dec2hex,
  hex2dec: hex2dec,
  leftpad: leftpad,
  base32tohex: base32tohex,
  calcTOTP: calcTOTP
}
