//index.js
//获取应用实例
const app = getApp()
const GA = require('../../utils/ga.js')

// wx.setStorage({
//   key: "key",
//   data: [{a:"value"}]
// })

// wx.getStorage({
//   key: 'key',
//   success: function(res) {
//     console.dir(res.data)
//   },
// })

Page({
  data: {
    totp: '',
    time: 0,
    show_edit: false,
    focus_edit: false,
    show_del: false,
    cur_name: '',
    cur_index: 0,
    codes: []
    // [
    //   {
    //     id: '7476j7vxbf6rzedy',
    //     code: '337 385',
    //     name: 'otcbtc.com(hejie@feng-qun.com)'
    //   },
    //   {
    //     id: 'AEL7UIBMCQ2IJUDJ',
    //     code: '964 852',
    //     name: 'dubaiex.com-1250682474@qq.com'
    //   }
    // ]
    // scanResult: null
  },

  onLoad: function () {
    let _this = this
    _this.countdown()
    wx.getStorage({
      key: 'otpauth',
      success: function (res) {
        _this.setData({
          codes: res.data
        })
        _this.updateTOTP()
      },
    })
  },

  onscan: function () {
    let _this = this
    wx.scanCode({
      success: (res) => {
        // this.setData({
        //   scanResult: res
        // })


        let id = this.getQueryString(res.result, 'secret')
        let name = this.getQueryString(res.result, 'issuer')

        wx.showModal({
          title: '扫描结果',
          content: res.result + ';' + name,
          showCancel: false,
          confirmColor: '#4285f4'
        })

        let code = {
          id: id,
          code: GA.calcTOTP(id),
          name: name
        }

        this.data.codes.push(code)

        this.setData({
          codes: this.data.codes
        })

        this.setStorage()
        
        console.log('res', res)
        console.log('code', code)
      },
      fail: () => {
        // this.setData({
        //   scanResult: null
        // })
        wx.showToast({
          icon: 'none',
          title: '未识别到有效二维码'
        })
      }
    })
  },

  onlongpress: function (event) {
    let _this = this
    let index = event.currentTarget.dataset.index
    let data = this.data.codes[index]
    this.setData({
      cur_name: data.name,
      cur_index: index
    })
    // console.log(data)
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: function (res) {
        // console.log(res.tapIndex)
        switch (res.tapIndex) {
          case 0: _this.showEdit(index); break;
          case 1: _this.showDel(index); break;
        }
      },
      fail: function (res) {
        // console.log(res.errMsg)
      }
    })
  },

  oninput: function (event) {
    this.setData({
      cur_name: event.detail.value
    })
  },

  copy: function (event) {
    let index = event.currentTarget.dataset.index
    let data = this.data.codes[index]
    wx.setClipboardData({
      data: data.code.replace(/\s/g, ''),
      success: function (res) {
        wx.showToast({
          title: '身份验证器：已将验证码复制到剪贴板。',
          icon: 'none'
        })
      }
    })
  },

  showEdit: function () {
    this.setData({
      show_edit: true,
      focus_edit: true
    })
  },

  hideEdit: function () {
    this.setData({
      show_edit: false
    })
  },

  confirmEdit: function () {
    let index = this.data.cur_index
    this.data.codes[index].name = this.data.cur_name
    this.setData({
      codes: this.data.codes
    })
    this.setStorage()
    this.hideEdit()
  },

  showDel: function () {
    this.setData({
      show_del: true
    })
  },

  confirmDel: function () {
    let index = this.data.cur_index
    this.data.codes.splice(index, 1)
    this.setData({
      codes: this.data.codes
    })
    this.setStorage()
    this.hideDel()
  },

  hideDel: function () {
    this.setData({
      show_del: false
    })
  },

  countdown: function () {
    let epoch = Math.round(new Date().getTime() / 1000.0)
    let seconds = 30 - (epoch % 30)
    if (epoch % 30 == 0) this.updateTOTP()
    this.setData({ time: seconds })
    setTimeout(this.countdown, 1000)
  },

  updateTOTP: function () {
    this.data.codes.map((item) => {
      item.code = GA.calcTOTP(item.id)
    })
    this.setData({
      codes: this.data.codes
    })
    this.setStorage()
  },

  setStorage: function () {
    wx.setStorage({
      key: 'otpauth',
      data: this.data.codes
    })
  },

  getQueryString: function (url, name) {
    let reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i')
    let str = url.indexOf('?') !== -1 ? url.slice(url.indexOf('?') + 1) : url
    let result = str.match(reg)
    if (result != null) {
      return decodeURIComponent(result[2])
    }
    return null
  }
})
