// 获取应用实例
// const APP = getApp()

// 获取谷歌验证算法（基于时间）
const GA = require('../../utils/ga.js')

// 注册页面
Page({
  data: {
    // 验证码刷新倒计时（30s）
    time: 0,

    // 是否显示“重命名”弹窗
    show_edit: false,

    // 是否显示“选择添加账号方式”弹窗
    show_choose: false,

    // “重命名”弹窗输入框是否获得焦点
    focus_edit: false,

    // 是否显示“删除确认”弹窗
    show_del: false,

    // 是否显示“添加”弹窗
    show_add: false,

    // “添加”弹窗账号名输入框是否获得焦点
    focus_add: false,

    // 正在添加的账号名
    input_user: '',

    // 正在添加的密钥
    input_key: '',

    // 当前正在操作（长按）的谷歌验证码的用户名（user）
    cur_user: '',

    // 当前正在操作（长按）的谷歌验证码的在数组中的位置
    cur_index: 0,

    // 包含所有谷歌验证码的数组，数据格式示例：
    // [
    //   { "key": "JBSWY3DPEHPK3PXP", "code": "744 144", "user": "user@host.com" }
    // ]
    codes: []
  },

  // 页面加载，一个页面只会调用一次
  onLoad: function () {
    let _this = this

    // 倒计时开始
    _this.countdown()

    // 获取 localStorage 存储的验证码数组
    wx.getStorage({
      key: 'otpauth',
      success: function (res) {
        _this.setData({
          codes: res.data
        })
        // 计算一次 totp
        _this.updateTOTP()
      },
    })
  },

  // 微信扫码添加谷歌验证码
  scan: function () {
    this.hideChoose()
    wx.scanCode({
      success: (res) => {
        // 如果扫码结果不符合谷歌验证码链接格式，正确格式如下：
        // otpauth://totp/user@host.com?secret=JBSWY3DPEHPK3PXP&issuer=host.com
        if (!/^otpauth:\/\/totp\//.test(res.result)) {
          this.toast('未识别到有效二维码')
          return
        }

        // 获取密钥信息
        let key = this.getParam(res.result, 'secret')

        // 获取用户名信息
        let user = res.result.split('/').pop().split('?').shift()

        // wx.showModal({
        //   title: '扫描结果',
        //   content: res.result + ';' + key + ';' + user,
        //   showCancel: false,
        //   confirmColor: '#4285f4'
        // })

        this.addAccount(key, user)
      },
      fail: () => {
        this.toast('扫码失败')
      }
    })
  },

  // 点击“添加”按钮，选择添加账号的方式
  // 扫描条形码 or 输入提供的密钥
  // onadd: function () {
  //   this.showChoose()
  //   // let _this = this
  //   // wx.showActionSheet({
  //   //   itemList: ['扫描条形码', '输入提供的密钥'],
  //   //   success: function (res) {
  //   //     switch (res.tapIndex) {
  //   //       case 0: _this.scan(); break;
  //   //       case 1: _this.showAdd(); break;
  //   //     }
  //   //   },
  //   //   fail: function (res) {
  //   //     console.log(res.errMsg)
  //   //   }
  //   // })
  // },

  // 添加新账号，并更新 localStorage
  addAccount: function (key, user) {
    let code
    try {
      code = GA.calcTOTP(key)
    } catch (err) {
      // 密钥格式不符合算法要求
      this.toast('密钥格式有误')
      return false
    }

    this.data.codes.push({
      key: key,
      code: code,
      user: user
    })

    this.setData({
      codes: this.data.codes
    })

    this.setStorage()

    this.toast('iAuthenticator：密钥已保存')

    return true
  },

  // 长按数据项进行相关操作
  onlongpress: function (event) {
    let _this = this

    // 当前项的 index
    let index = event.currentTarget.dataset.index

    // 当前 index 对应的数据
    let data = this.data.codes[index]

    this.setData({
      cur_user: data.user,
      cur_index: index
    })

    // 操作选择：编辑（重命名） or 删除
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

  // “编辑”输入框值同步到 data
  oninput: function (event) {
    this.setData({
      cur_user: event.detail.value
    })
  },

  // “添加用户名”输入框值同步到 data
  onuseradd: function (event) {
    this.setData({
      input_user: event.detail.value
    })
  },

  // “添加密钥”输入框值同步到 data
  onkeyadd: function (event) {
    this.setData({
      input_key: event.detail.value
    })
  },

  // 显示“添加”弹窗，输入框获得焦点
  showAdd: function () {
    this.setData({
      show_add: true,
      focus_add: true,
      show_choose: false
    })
  },

  // 隐藏“添加”弹窗
  hideAdd: function () {
    this.setData({
      input_user: '',
      input_key: '',
      show_add: false
    })
  },

  // 显示“选择”弹窗，输入框获得焦点
  showChoose: function () {
    this.setData({
      show_choose: true
    })
  },

  // 隐藏“选择”弹窗
  hideChoose: function () {
    this.setData({
      show_choose: false
    })
  },

  // 保存新添加的数据
  confirmAdd: function () {
    let user = this.data.input_user
    let key = this.data.input_key

    if (!user) {
      this.toast('请输入账号名')
      return
    }

    if (!key) {
      this.toast('请输入您的密钥')
      return
    }

    if (this.addAccount(key, user)) {
      this.hideAdd()
    }
  },

  // 点击数据项，复制对应的验证码（不包含空格）
  copy: function (event) {
    let _this = this
    let index = event.currentTarget.dataset.index

    // 获取当前项对应的验证码，并去掉中间的空格
    let code = this.data.codes[index].code.replace(/\s/g, '')

    // 将验证码复制到剪贴板
    wx.setClipboardData({
      data: code,
      success: function (res) {
        _this.toast('iAuthenticator：验证码已复制')
      }
    })
  },

  // 显示“编辑”弹窗，输入框获得焦点
  showEdit: function () {
    this.setData({
      show_edit: true,
      focus_edit: true
    })
  },

  // 隐藏“编辑”弹窗
  hideEdit: function () {
    this.setData({
      show_edit: false
    })
  },

  // 保存编辑后的结果并隐藏弹窗
  confirmEdit: function () {
    let index = this.data.cur_index

    this.data.codes[index].user = this.data.cur_user

    this.setData({
      codes: this.data.codes
    })

    this.setStorage()

    this.hideEdit()
  },

  // 显示“删除”弹窗
  showDel: function () {
    this.setData({
      show_del: true
    })
  },

  // 点击“删除账号”，删除当前数据项
  confirmDel: function () {
    let index = this.data.cur_index

    // 从数组中删除当前项
    this.data.codes.splice(index, 1)

    this.setData({
      codes: this.data.codes
    })

    this.setStorage()

    this.hideDel()
  },

  // 隐藏“删除”弹框
  hideDel: function () {
    this.setData({
      show_del: false
    })
  },

  // 30s 倒计时函数
  countdown: function () {
    // 获取当前 UTC 时间戳
    let epoch = Math.round(new Date().getTime() / 1000.0)

    // 获取当前秒数（0-30）
    let seconds = 30 - (epoch % 30)

    // 每 30s 重新计算一次验证码
    if (epoch % 30 == 0) this.updateTOTP()

    // 将秒数赋值到页面数据 time，实现饼图倒计时效果
    this.setData({ time: seconds })

    // 每 1s 回调一次倒计时函数
    setTimeout(this.countdown, 1000)
  },

  // 更新验证码数据
  updateTOTP: function () {
    this.data.codes.map((item) => {
      item.code = GA.calcTOTP(item.key)
    })

    this.setData({
      codes: this.data.codes
    })

    this.setStorage()
  },

  // 将用户验证码数据存储到 localStorage 中，命名为“otpauth”
  setStorage: function () {
    wx.setStorage({
      key: 'otpauth',
      data: this.data.codes
    })
  },

  // 获取 url 字符串中某个参数的值
  getParam: function (url, name) {
    // 根据不同的 name 动态生成正则表达式
    let reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i')

    // 获得 url “?” 后面的字符串，比如：
    // 输入：'secret=JBSWY3DPEHPK3PXP&issuer=host.com'.match(/(^|&)secret=([^&]*)(&|$)/i)
    // 返回：["secret=JBSWY3DPEHPK3PXP&", "", "JBSWY3DPEHPK3PXP", "&", index: 0, input: ...]
    let str = url.split('?').pop()

    // 获取正则匹配后的值
    let result = str.match(reg)

    // 匹配成功则返回对应值：[]
    if (result != null) {
      return decodeURIComponent(result[2])
    }

    // 匹配失败返回 null
    return null
  },

  // 不带 icon 的 toast 提示
  toast: function (msg) {
    wx.showToast({
      title: msg,
      icon: 'none'
    })
  }
})
