// 获取应用实例
// const APP = getApp()

// 获取谷歌验证算法
const GA = require('../../utils/ga.js')

// 注册页面
Page({
  data: {
    // 验证码刷新倒计时（30s）
    time: 0,
    // 是否显示“重命名”弹窗
    show_edit: false,
    // “重命名”弹窗输入框是否获得焦点
    focus_edit: false,
    // 是否显示“删除确认”弹窗
    show_del: false,
    // 当前正在操作（长按）的谷歌验证码的用户名（user）
    cur_user: '',
    // 当前正在操作（长按）的谷歌验证码的在数组中的位置
    cur_index: 0,
    // 包含所有谷歌验证码的数组，数据格式示例：
    // [
    //   { "key": "7476J7VXBF6RZEDY", "code": "994 889", "user": "Blog" },
    //   { "key": "QEO4O7SL4XLZ7LUP", "code": "433 066", "user": "candy" }
    // ]
    codes: []
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
        let key = this.getParam(res.result, 'secret')
        let user = res.result.split('/').pop().split('?').shift()

        // wx.showModal({
        //   title: '扫描结果',
        //   content: res.result + ';' + user,
        //   showCancel: false,
        //   confirmColor: '#4285f4'
        // })

        this.data.codes.push({
          key: key,
          code: GA.calcTOTP(key),
          user: user
        })

        this.setData({
          codes: this.data.codes
        })

        this.setStorage()
        wx.showToast({
          title: '身份验证器：密钥已保存',
          icon: 'none'
        })
      },
      fail: () => {
        wx.showToast({
          title: '未识别到有效二维码',
          icon: 'none'
        })
      }
    })
  },

  onlongpress: function (event) {
    let _this = this
    let index = event.currentTarget.dataset.index
    let data = this.data.codes[index]
    this.setData({
      cur_user: data.user,
      cur_index: index
    })
    
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: function (res) {
        switch (res.tapIndex) {
          case 0: _this.showEdit(index); break;
          case 1: _this.showDel(index); break;
        }
      },
      fail: function (res) {
        console.log(res.errMsg)
      }
    })
  },

  oninput: function (event) {
    this.setData({
      cur_user: event.detail.value
    })
  },

  copy: function (event) {
    let index = event.currentTarget.dataset.index
    let data = this.data.codes[index]
    wx.setClipboardData({
      data: data.code.replace(/\s/g, ''),
      success: function (res) {
        wx.showToast({
          title: '身份验证器：已将验证码复制到剪贴板',
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
    this.data.codes[index].user = this.data.cur_user
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
      item.code = GA.calcTOTP(item.key)
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

  getParam: function (url, name) {
    let reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i')
    let str = url.split('?').pop()
    let result = str.match(reg)
    if (result != null) {
      return decodeURIComponent(result[2])
    }
    return null
  }
})
