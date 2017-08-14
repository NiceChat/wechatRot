'use strict'
require('babel-register')
const Wechat = require('./src/wechat.js')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const request = require('request')

let bot
/**
 * 尝试获取本地登录数据，免扫码
 * 这里演示从本地文件中获取数据
 */
try {
  bot = new Wechat(require('./sync-data.json'))
} catch (e) {
  bot = new Wechat()
}
/**
 * 启动机器人
 */
if (bot.PROP.uin) {
  // 存在登录数据时，可以随时调用restart进行重启
  bot.restart()
} else {
  bot.start()
}
/**
 * uuid事件，参数为uuid，根据uuid生成二维码
 */
bot.on('uuid', uuid => {
  qrcode.generate('https://login.weixin.qq.com/l/' + uuid, {
    small: true
  })
  console.log('二维码链接：', 'https://login.weixin.qq.com/qrcode/' + uuid)
})
/**
 * 登录用户头像事件，手机扫描后可以得到登录用户头像的Data URL
 */
bot.on('user-avatar', avatar => {
  console.log('登录用户头像Data URL：', avatar)
})
/**
 * 登录成功事件
 */
bot.on('login', () => {
  console.log('登录成功')
  // 保存数据，将数据序列化之后保存到任意位置
  fs.writeFileSync('./sync-data.json', JSON.stringify(bot.botData))
})
/**
 * 登出成功事件
 */
bot.on('logout', () => {
  console.log('登出成功')
  // 清除数据
  fs.unlinkSync('./sync-data.json')
})
/**
 * 错误事件，参数一般为Error对象
 */
bot.on('error', err => {
  console.error('错误：', err)
})
/**
 * 如何处理会话消息
 */
bot.on('message', msg => {
  /**
   * 获取消息时间
   */
  console.log(`----------${msg.getDisplayTime()}----------`)
  /**
   * 获取消息发送者的显示名
   */
  console.log(bot.contacts[msg.FromUserName].getDisplayName())
  /**
   * 判断消息类型
   */
  switch (msg.MsgType) {
    case bot.CONF.MSGTYPE_TEXT:
      /**
       * 文本消息
       */
      console.dir('=============================文本信息=============================')
      const {Content, OriginalContent} = msg
      const index = Content.indexOf('@AI')
      if ( index !== -1) {
        const ToUserName = msg.FromUserName
        const reg = /^@\w+/
        let SendBackMsg, originalUserName, SendToUser
        SendToUser = OriginalContent.match(reg)
        const ReveiceUser = bot.contacts[SendToUser]
        let city = '深圳'
        // @机器人的人是否是好友
        if (ReveiceUser) {
          originalUserName = ReveiceUser.getDisplayName()
          SendBackMsg = `@${originalUserName} `
          city = ReveiceUser.city ? ReveiceUser.city : '深圳'
        } else {
          originalUserName = '艾特GG/MM:'
          SendBackMsg = `@${originalUserName}`
        }
        const input = Content.substr(index).replace('@AI', '').trim()
        if (!input) {
          bot.sendMsg('艾特我，把你想说跟我说呗！', ToUserName)
            .catch(err => {
              bot.emit('error', err)
            })
          return false;
        }
        let data = {
          perception: {
            inputText: {
              text: input
            },
            selfInfo: {
              location: {
                city
              }
            }
          },
          userInfo: {
            apiKey: 'eb45e104b4cd4c92aa6b2e30f0e991c3',
            userId: 1
          }
        }
        bot.request({
          method: 'POST',
          url: 'http://openapi.tuling123.com/openapi/api/v2',
          data: data
        }).then(res => {
          console.log(res.data)
          const { results } = res.data
          if (results) {
            const textResult = results.find(result => {
              console.dir(result)
              return result.resultType == 'text'
            })
            SendBackMsg = SendBackMsg + textResult.values.text
            bot.sendMsg(SendBackMsg, ToUserName)
              .catch(err => {
                bot.emit('error', err)
              })
          } else {
            bot.sendMsg('不明白您说的意思', ToUserName)
              .catch(err => {
                bot.emit('error', err)
              })
          }
        })
      }
      break
    // case bot.CONF.MSGTYPE_IMAGE:
    //   /**
    //    * 图片消息
    //    */
    //   console.log('图片消息，保存到本地')
    //   bot.getMsgImg(msg.MsgId).then(res => {
    //     fs.writeFileSync(`./media/${msg.MsgId}.jpg`, res.data)
    //   }).catch(err => {
    //     bot.emit('error', err)
    //   })
    //   break
    // case bot.CONF.MSGTYPE_VOICE:
    //   /**
    //    * 语音消息
    //    */
    //   console.log('语音消息，保存到本地')
    //   bot.getVoice(msg.MsgId).then(res => {
    //     fs.writeFileSync(`./media/${msg.MsgId}.mp3`, res.data)
    //   }).catch(err => {
    //     bot.emit('error', err)
    //   })
    //   break
    // case bot.CONF.MSGTYPE_EMOTICON:
    //   /**
    //    * 表情消息
    //    */
    //   console.log('表情消息，保存到本地')
    //   bot.getMsgImg(msg.MsgId).then(res => {
    //     fs.writeFileSync(`./media/${msg.MsgId}.gif`, res.data)
    //   }).catch(err => {
    //     bot.emit('error', err)
    //   })
    //   break
    // case bot.CONF.MSGTYPE_VIDEO:
    // case bot.CONF.MSGTYPE_MICROVIDEO:
    //   /**
    //    * 视频消息
    //    */
    //   console.log('视频消息，保存到本地')
    //   bot.getVideo(msg.MsgId).then(res => {
    //     fs.writeFileSync(`./media/${msg.MsgId}.mp4`, res.data)
    //   }).catch(err => {
    //     bot.emit('error', err)
    //   })
    //   break
    // case bot.CONF.MSGTYPE_APP:
    //   if (msg.AppMsgType == 6) {
    //     /**
    //      * 文件消息
    //      */
    //     console.log('文件消息，保存到本地')
    //     bot.getDoc(msg.FromUserName, msg.MediaId, msg.FileName).then(res => {
    //       fs.writeFileSync(`./media/${msg.FileName}`, res.data)
    //       console.log(res.type);
    //     }).catch(err => {
    //       bot.emit('error', err)
    //     })
    //   }
    //   break
    default:
      if (!msg.FromUserName) return
      const count = msg.Content.indexOf('@AI')
      count && bot.sendMsg('别给我发我看不懂的东西，憋屈！', msg.FromUserName)
        .catch(err => {
          bot.emit('error', err)
        })
      break
  }
})