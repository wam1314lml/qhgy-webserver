import J from 'jsencrypt'
import B from '@alttiri/base85'

const TE = new TextEncoder()
const TD = new TextDecoder()

const d1 = 'ZGVjMQ'.concat('==')
const d2 = atob(d1).replace('1', '')
const c1 = 'b2RlMg'.concat('==')
const c2 = atob(c1).replace('2', '')
const dc = d2.concat(c2) // encode
const d4 = 'ZTFuMWMxbzE'.concat('=')
const d5 = atob(d4).replace(/1/g, '')
const d6 = 'ZDJlMg'.concat('==')
const d7 = atob(d6).replace(/2/g, '')
const en = d5.concat(d7) // encode
const p = 'B7GC&BZ/f3v[QxU'
// @ts-expect-error dynamic key access
const p1 = B[dc](p)
// @ts-expect-error dynamic key access
const p2 = TD[dc](p1) // setPublicKey
const p3 = 'wO#0#D2N<'
// @ts-expect-error dynamic key access
const p4 = B[dc](p3)
// @ts-expect-error dynamic key access
const p5 = TD[dc](p4) // encrypt
const p6 = 'wmYm>D2N<'
// @ts-expect-error dynamic key access
const p7 = B[dc](p6)
// @ts-expect-error dynamic key access
const p8 = TD[dc](p7) // decrypt
const q = 'B7GC&A+PY9By!9RC('
// @ts-expect-error dynamic key access
const q1 = B[dc](q)
// @ts-expect-error dynamic key access
const q2 = TD[dc](q1) // setPrivateKey

// =================== base85  ===================
// const encString = `setPrivateKey`
// const encBuffer = TE.encode(encString)
// const result = B.encode(encBuffer)
// console.log(result)

// const decBuffer = B.decode(result)
// const decString = TD.decode(decBuffer)
// console.log(decString)
// =================== base85 ===================

const b2 = `eIeLaeKz(@nLQy8ryfwJlM/2<sUhiSeIdr7nK)w!k}>!@q/LranN:Fzqai/qqb][Fg!gqbl{<pPqa<k*qa9/wp/*B<nKEbRh:PxCr=?egp=p^Xo>FwLmODALqa9@>h:]S3B4f5wp=iM5nOqQcxh}R$f!l)kf?Lk!DrLO%np0VWpbVf&h/.nTmkx9Tp!URcmP&P93v2MKgeR*?fJo]dz9&t^w>=uLr4@zZxeJp&AwPE&d)=JLsyK<wgEi-#s8..*fhs(rAb/XGxkzojp!+8bfBy@Kh+mBsd@X]Lnh@Rcha?1GnKL<wk%+]geIeLamnuk[p/P?QnKBQ[moIh]eIeK`
// @ts-expect-error dynamic key access
const b3 = B[dc](b2)
// @ts-expect-error dynamic key access
const K = TD[dc](b3)

const e1 =
  'eIeLaeKz(@nLQy8qB%[Pr7d{5moIh]eIeKYo?v]zwKe)Ok$11llt77NxLRrLiD)ezk#y6uk%XBpl2xhqxj<?Fl1-RLl2PmWk$$6NiAXjdxg>JUB4ygn3rF]vyCfQcv%xIxrDz$Ck$$])B5W6dCudj9fk:K2x*KT@lq./wst&C#rCKJ!phSWpw>=9igJl=8B-Qb&r0)86sVyL0yGtaovN:l$t0(h1qC.g5sW$k4icX[8p/x5zl#cQUA+Yf2g^%!&wohE9v)<vhvqE&li50%wze/[+s3{4.g=P.]oJ2I5B7xOMhF^zpw{Mg5yIWVIxh7YUk$adNsW+R#m}V*UydAIXv@a?Th8fndAAVvUAX.qnxFz@3xl319n[zc=f?$?)xeKTJv(Ne5y!4rxzGZj(lRIhElU*BQwQe2Wqa><UyiS6pCq%X-xlVvDy/$)&3uQhVnjUQnh=%GXic)#8y&TJiyFYpohFDcesY)ylgG5u!BA.OoCwg2Am[#&IfM.zcyF5U[f&qKSq:Tkir%<k0vn*e#pe+:>lOATQfk1:qfHFYml]mOpt5FaIxH%)(x&)idq!nEqoM@)4yi.:Go/D/+gIF<TlORXxB72z>gb0oth!D!:o*?&RgFR$lDqXo*sA!<*g/[-@l@c(!v(4TMfIL8nr:53WyEHKmrcgPzgCR#$AXz3zsVf}2y+6N8s8?[fsyT9ywoZHlnJp&<zfmM/zDRl]vQS>/vm%l:qb*1UDu%7AAw}V3hek0BvQ&zid@N[0h-BPy3rIEFC1cWFlp1puic)A1vQ%dhyIC+4hdOKAt1r)vpbaRwoi0GTp=p<!ols/6f&g[Ziz9)wpC#c&vSlH3hWTw7xMd)hd>sRih!>frBtdC.oH.AMraGY=vqPgrryoRNvL*2Ef)W!Gh=0NHpfpN#y?+}2f)W}1mOdL=CUerOx*=5<ADs8]fha]5o?w?/y/j[2Bxp}nmosm+h.P5cqETA!i6}mEo*@J5x<2QBiyu[Cxgkf+qaaqVf&qu^k#H9yd>:WNw{vfjn{aq/p&X&]m]z6vB$^VcCX.N+wna>sgd:e(y&@8#mSS&yh8fzWq!esmrc*L]n>A}<3qi3/g&ET[vRGy@gC@R@ismt&eIeLypdcj3qB%[Pr7d{5moIh]eIeK'
// @ts-expect-error dynamic key access
const e2 = B[dc](e1)
// @ts-expect-error dynamic key access
const P = TD[dc](e2)
/**
 * 加密类
 */
class E {
  private j: J

  constructor(k?: string) {
    this.j = new J()
    // @ts-expect-error dynamic key access
    this.j[p2](k || K)
  }

  /**
   * 加密
   */
  e(d: string): string {
    let r1
    try {
      // @ts-expect-error dynamic key access
      const r = this.j[p5](d)
      r1 = r || d
    } catch {
      r1 = d
    }
    // @ts-expect-error dynamic key access
    const r2 = TE[en](r1)
    // @ts-expect-error dynamic key access
    const result = B[en](r2)
    return result
  }
}

/**
 * 解密类
 */
class D {
  private j: J

  constructor(p?: string) {
    this.j = new J()
    // @ts-expect-error dynamic key access
    this.j[q2](p || P)
  }

  /**
   * 解密
   */
  d(s: string): string {
    // @ts-expect-error dynamic key access
    const s1 = B[dc](s)
    // @ts-expect-error dynamic key access
    const s2 = TD[dc](s1)
    try {
      // @ts-expect-error dynamic key access
      const r = this.j[p8](s2)
      return r || s2
    } catch {
      return s2
    }
  }
}

// 导出实例
// 使用示例:
// import { enc, dec } from '@/utils/enc'
// const encrypted = enc.e('要加密的数据')
// const decrypted = dec.d(encrypted)
export const e3 = new E()
export const d3 = new D()

// =================== RSA  ===================
// const rsaEncString = e3.e('X-Signature')
// console.log(rsaEncString)
// const rsaResult = d3.d(rsaEncString)
// console.log(rsaResult)
// =================== RSA  ===================

// 导出类（如需自定义密钥）
export { E, D }
