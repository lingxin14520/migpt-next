import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 本地密钥文件（.gitignore 已忽略，不会提交）：apps/example/.env.local
// 可参考同目录下的 .env.local.example，把密钥和音箱账号写进去即可
const localEnvPath = fileURLToPath(new URL('.env.local', import.meta.url));
if (existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

// 小爱原生就能处理的设备控制指令：命中后不调用 AI，交回小爱执行，避免抢答/重复播报
const kDeviceCommandPattern =
  /打开|关闭|关掉|开一下|关上|开启|暂停|继续播放|停止|播放|下一首|上一首|音量|静音|大声|小声|模式|温度|亮度|色温|风速|定时|倒计时|开灯|关灯|灯光|空调|风扇|扫地|窗帘|插座|电视|净化器|加湿器|除湿机|暖风机|晾衣架|热水器|摄像头|门锁|浴霸|新风机|电饭煲|洗衣机|冰箱|开关|遥控|红外|传感器/;

/**
 * @type {import('@mi-gpt/next').MiGPTConfig}
 */
export default {
  debug: false, // 是否开启调试模式
  speaker: {
    /**
     * 小爱音箱在米家中设置的名称
     *
     * 如果提示找不到设备，请打开调试模式获取设备真实的 name、miotDID 或 mac 地址填入
     */
    did: process.env.MIGPT_SPEAKER_DID || 'Xiaomi 智能音箱 Pro',
    /**
     * 小米 ID（一串数字）
     *
     * 注意：不是手机号或邮箱，请在小米账号「个人信息」-「小米 ID」查看
     */
    userId: process.env.MIGPT_USER_ID || '1234567',
    /**
     * 小米账号登录密码
     *
     * 如果提示登录失败，请使用 passToken 登录
     */
    password: process.env.MIGPT_PASSWORD || 'xxxxx',
    /**
     * （可选）小米账号 passToken
     *
     * 获取教程：https://github.com/idootop/migpt-next/issues/4
     */
    passToken: process.env.MIGPT_PASS_TOKEN || 'xxxxxxxxx',
  },
  openai: {
    /**
     * 你的大模型服务提供商的接口地址
     *
     * 支持兼容 OpenAI 接口的大模型服务，比如：DeepSeek V3 等
     *
     * 注意：一般以 /v1 结尾，不包含 /chat/completions 部分
     * - ✅ https://api.openai.com/v1
     * - ❌ https://api.openai.com/v1/（最后多了一个 /
     * - ❌ https://api.openai.com/v1/chat/completions（不需要加 /chat/completions）
     */
    // 大模型接口地址：默认走 DeepSeek（兼容 OpenAI 接口），可用环境变量覆盖
    baseURL: process.env.MIGPT_BASE_URL || 'https://api.deepseek.com/v1',
    /**
     * API 密钥
     */
    // 密钥：读取本机已有的 DEEPSEEK_API_KEY 环境变量，避免把密钥写进仓库
    apiKey: process.env.MIGPT_API_KEY || process.env.DEEPSEEK_API_KEY || '',
    /**
     * 模型名称
     */
    model: process.env.MIGPT_MODEL || 'deepseek-chat',
  },
  prompt: {
    /**
     * 系统提示词，如需关闭可设置为：''（空字符串）
     */
    system: '你是一个智能助手，请根据用户的问题给出回答。',
  },
  context: {
    /**
     * 每次对话携带的最大历史消息数（如需关闭可设置为：0）
     */
    historyMaxLength: 10,
  },
  /**
   * 只回答以下关键词开头的消息：
   *
   * - 请问地球为什么是圆的？
   * - 你知道世界上跑的最快的动物是什么吗？
   */
  // 空字符串 '' 表示所有消息都交给 AI 回复（设备控制指令已在 onMessage 里排除）
  callAIKeywords: [''],
  /**
   * 自定义消息回复
   */
  async onMessage(engine, { text }) {
    // 设备控制类指令交回小爱原生处理
    if (kDeviceCommandPattern.test(text)) {
      return { handled: true };
    }

    if (text === '测试播放文字') {
      return { text: '你好，很高兴认识你！' };
    }

    if (text === '测试播放音乐') {
      return { url: 'https://example.com/hello.mp3' };
    }

    if (text === '测试其他能力') {
      // 打断原来小爱的回复
      await engine.speaker.abortXiaoAI();

      // 播放文字
      await engine.speaker.play({ text: '你好' });

      // 播放音频链接
      await engine.speaker.play({ url: 'https://example.com/hello.mp3' });

      // 调用 MiNA 的能力
      await engine.MiNA.setVolume(50); // 音量调到 50%

      // 调用 MioT 的能力（请到 https://home.miot-spec.com 查询指令列表）
      await engine.MiOT.doAction(2, 1, 50); // 音量调到 50%

      // 告诉 MiGPT 已经处理过这条消息了，不再使用默认的 AI 回复
      return { handled: true };
    }
  },
};
