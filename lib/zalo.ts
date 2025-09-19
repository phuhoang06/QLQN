// Zalo OA API utilities
export interface ZaloUser {
  user_id: string
  display_name: string
  avatar?: string
}

export interface ZaloMessage {
  recipient: {
    user_id: string
  }
  message: {
    text: string
  }
}

export interface ZaloBroadcastMessage {
  message: {
    text: string
  }
}

class ZaloAPI {
  private accessToken: string
  private appId: string
  private appSecret: string

  constructor() {
    this.accessToken = process.env.ZALO_OA_ACCESS_TOKEN || ''
    this.appId = process.env.ZALO_OA_APP_ID || ''
    this.appSecret = process.env.ZALO_OA_APP_SECRET || ''
  }

  // Lấy access token mới (nếu cần refresh)
  async getAccessToken(): Promise<string> {
    if (!this.appId || !this.appSecret) {
      throw new Error('Zalo OA App ID hoặc App Secret chưa được cấu hình')
    }

    const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.appId,
        client_secret: this.appSecret,
      }),
    })

    if (!response.ok) {
      throw new Error('Không thể lấy access token từ Zalo OA')
    }

    const data = await response.json()
    return data.access_token
  }

  // Gửi tin nhắn cho 1 người
  async sendMessage(userId: string, message: string): Promise<boolean> {
    try {
      const accessToken = this.accessToken || await this.getAccessToken()
      
      const response = await fetch('https://openapi.zalo.me/v2.0/oa/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': accessToken,
        },
        body: JSON.stringify({
          recipient: {
            user_id: userId
          },
          message: {
            text: message
          }
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Zalo API Error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending Zalo message:', error)
      return false
    }
  }

  // Gửi tin nhắn broadcast cho nhiều người
  async sendBroadcast(userIds: string[], message: string): Promise<{ success: number, failed: number }> {
    let success = 0
    let failed = 0

    // Zalo OA có giới hạn 40 tin/người/tháng, nên gửi tuần tự để tránh spam
    for (const userId of userIds) {
      const result = await this.sendMessage(userId, message)
      if (result) {
        success++
      } else {
        failed++
      }
      
      // Delay 1 giây giữa các tin nhắn để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return { success, failed }
  }

  // Lấy thông tin user từ Zalo
  async getUserInfo(userId: string): Promise<ZaloUser | null> {
    try {
      const accessToken = this.accessToken || await this.getAccessToken()
      
      const response = await fetch(`https://openapi.zalo.me/v2.0/oa/getprofile?data={"user_id":"${userId}"}`, {
        method: 'GET',
        headers: {
          'access_token': accessToken,
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return {
        user_id: data.user_id,
        display_name: data.display_name,
        avatar: data.avatar
      }
    } catch (error) {
      console.error('Error getting Zalo user info:', error)
      return null
    }
  }

  // Kiểm tra xem có thể gửi tin nhắn không
  canSendMessage(): boolean {
    return !!(this.accessToken || (this.appId && this.appSecret))
  }
}

export const zaloAPI = new ZaloAPI()

// Template tin nhắn
export const messageTemplates = {
  // Nhắc nộp tiền
  reminder: (userName: string, week: number, amount: number, dueDate: string) => 
    `🔔 Nhắc nhở đóng quỹ\n\nXin chào ${userName}!\n\nTuần ${week} đã đến hạn đóng quỹ:\n💰 Số tiền: ${amount.toLocaleString('vi-VN')} VNĐ\n📅 Hạn nộp: ${dueDate}\n\nVui lòng đóng tiền đúng hạn để tránh bị phạt.\n\nCảm ơn bạn!`,

  // Báo nợ và phạt
  overdue: (userName: string, week: number, amount: number, penalty: number, dueDate: string) =>
    `⚠️ Cảnh báo quá hạn\n\nXin chào ${userName}!\n\nBạn đã quá hạn đóng quỹ tuần ${week}:\n💰 Số tiền gốc: ${amount.toLocaleString('vi-VN')} VNĐ\n💸 Tiền phạt: ${penalty.toLocaleString('vi-VN')} VNĐ\n📅 Hạn nộp: ${dueDate}\n\nTổng cộng cần đóng: ${(amount + penalty).toLocaleString('vi-VN')} VNĐ\n\nVui lòng đóng tiền ngay để tránh phạt thêm.\n\nCảm ơn bạn!`,

  // Thống kê cuối tháng
  monthlyReport: (userName: string, month: string, totalPaid: number, totalUnpaid: number, totalPenalty: number) =>
    `📊 Báo cáo tháng ${month}\n\nXin chào ${userName}!\n\nTình hình đóng quỹ tháng ${month}:\n✅ Đã đóng: ${totalPaid.toLocaleString('vi-VN')} VNĐ\n❌ Chưa đóng: ${totalUnpaid.toLocaleString('vi-VN')} VNĐ\n💸 Tiền phạt: ${totalPenalty.toLocaleString('vi-VN')} VNĐ\n\nCảm ơn bạn đã tham gia!`,

  // Thông báo đã đóng thành công
  paidSuccess: (userName: string, week: number, amount: number) =>
    `✅ Xác nhận đóng quỹ\n\nXin chào ${userName}!\n\nBạn đã đóng quỹ tuần ${week} thành công:\n💰 Số tiền: ${amount.toLocaleString('vi-VN')} VNĐ\n\nCảm ơn bạn!`
}
